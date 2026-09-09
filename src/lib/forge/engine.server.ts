/**
 * Challenge engine orchestrator (server-only).
 *
 * Owns persistence, XP grading (idempotent, server side only) and the
 * executor → verifier → observer pipeline. Called exclusively from the
 * authenticated server functions in `engine.functions.ts`.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { buildContext } from "./context.server";
import { CONTRACTS, contractById, toBrief } from "./contracts.server";
import type { ModelObject, World } from "./executor.server";
import { ensureLabSession, executeInLab } from "./sandbox/lab.server";
import { deterministicObserver } from "./observer.server";
import { verify } from "./verifier.server";
import { SKILL_LABELS } from "./types";
import type {
  ObservationCategory,

  AttemptView,
  MissionState,
  NarrativeEventView,
  Observation,
  RunResult,
  SkillId,
  SkillMemoryView,
  TerminalLine,
  Verification,
  VerificationStatus,
  WorldObjectView,
} from "./types";

type Tables = Database["public"]["Tables"];
type AttemptRow = Tables["learner_challenge_attempts"]["Row"];
type ChallengeEventRow = Tables["learner_challenge_events"]["Row"];
type HintRow = Tables["learner_hint_usage"]["Row"];

export type Db = SupabaseClient<Database>;
type Lang = "English" | "Hinglish" | "Mix both";

/** Narrow an unknown JSON value to a plain object without widening to `any`. */
function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

const asString = (value: unknown, fallback = ""): string => (typeof value === "string" ? value : fallback);

const isSkillId = (value: string): value is SkillId => value in SKILL_LABELS;

const OBSERVATION_CATEGORIES: readonly ObservationCategory[] = [
  "TYPO",
  "WRONG_COMMAND",
  "WRONG_ARGUMENT",
  "WRONG_PATH",
  "WRONG_FILENAME",
  "MISREAD_QUESTION",
  "CONCEPT_CONFUSION",
  "PARTIAL_UNDERSTANDING",
  "UNSAFE_APPROACH",
  "RANDOM_TRIAL_AND_ERROR",
  "SKILL_BYPASS",
  "VALID_ALTERNATIVE",
  "INDEPENDENT_SOLUTION",
];




const LAB_KEY = "forge-core";

async function ensureLab(db: Db, userId: string) {
  const existing = await db.from("learner_labs").select("*").eq("user_id", userId).eq("lab_key", LAB_KEY).maybeSingle();
  if (existing.error) throw new Error(existing.error.message);
  if (existing.data) return existing.data;
  const created = await db
    .from("learner_labs")
    .insert({ user_id: userId, lab_key: LAB_KEY, title: "Forge training lab" })
    .select("*")
    .single();
  if (created.error) throw new Error(created.error.message);
  return created.data;
}

async function loadWorld(db: Db, userId: string, labId: string) {
  const res = await db
    .from("lab_world_objects")
    .select("*")
    .eq("user_id", userId)
    .eq("lab_id", labId)
    .eq("active", true);
  if (res.error) throw new Error(res.error.message);
  const world: World = new Map();
  const views: WorldObjectView[] = [];
  for (const r of res.data ?? []) {
    const state = asRecord(r.current_state);
    const objectType = r.object_type === "directory" ? ("directory" as const) : ("file" as const);
    const obj: ModelObject = {
      objectId: r.object_id,
      objectType,
      path: r.path,
      name: r.name,
      permissions: asString(state["permissions"], objectType === "directory" ? "755" : "644"),
      content: asString(state["content"], ""),
      active: true,
      createdByChallenge: r.created_by_challenge ?? null,
      lastModifiedByChallenge: r.last_modified_by_challenge ?? null,
      createdAt: r.created_at,
    };

    world.set(obj.path, obj);
    views.push({
      objectId: obj.objectId,
      objectType: obj.objectType,
      path: obj.path,
      name: obj.name,
      permissions: obj.permissions,
      createdByChallenge: obj.createdByChallenge,
      lastModifiedByChallenge: obj.lastModifiedByChallenge,
      createdAt: obj.createdAt,
    });
  }
  views.sort((a, b) => a.path.localeCompare(b.path));
  return { world, views };
}

async function loadAttempts(db: Db, userId: string) {
  const res = await db.from("learner_challenge_attempts").select("*").eq("user_id", userId);
  if (res.error) throw new Error(res.error.message);
  return res.data ?? [];
}

async function loadSkills(db: Db, userId: string): Promise<SkillMemoryView[]> {
  const res = await db.from("learner_skill_memory").select("*").eq("user_id", userId);
  if (res.error) throw new Error(res.error.message);
  return (res.data ?? []).map((r) => ({
    skillId: r.skill_id as SkillId,
    mastery: r.mastery,
    attempts: r.attempts,
    successfulAttempts: r.successful_attempts,
    recentScore: r.recent_score ?? null,
    recentMistakes: r.recent_mistakes ?? [],
    hintDependency: r.hint_dependency,
    lastPracticed: r.last_practiced ?? null,
    nextReview: r.next_review ?? null,
    confidence: r.confidence,
  }));
}

async function loadEvents(db: Db, userId: string): Promise<NarrativeEventView[]> {
  const res = await db
    .from("learning_narrative_events")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(30);
  if (res.error) throw new Error(res.error.message);
  return (res.data ?? []).map((r) => ({
    eventId: r.event_id,
    challengeId: r.challenge_id ?? null,
    eventType: r.event_type,
    summary: r.summary,
    importance: r.importance,
    createdAt: r.created_at,
    relatedSkillIds: r.related_skill_ids ?? [],
  }));
}

async function loadProgression(db: Db, userId: string) {
  const res = await db.from("learner_progression").select("*").eq("user_id", userId).maybeSingle();
  if (res.error) throw new Error(res.error.message);
  if (res.data) return res.data;
  const created = await db.from("learner_progression").insert({ user_id: userId }).select("*").single();
  if (created.error) throw new Error(created.error.message);
  return created.data;
}

async function loadChallengeEvents(db: Db, userId: string, challengeId: string) {
  const res = await db
    .from("learner_challenge_events")
    .select("*")
    .eq("user_id", userId)
    .eq("challenge_id", challengeId)
    .order("created_at", { ascending: true })
    .limit(200);
  if (res.error) throw new Error(res.error.message);
  return res.data ?? [];
}

async function loadHints(db: Db, userId: string, challengeId: string) {
  const res = await db
    .from("learner_hint_usage")
    .select("*")
    .eq("user_id", userId)
    .eq("challenge_id", challengeId)
    .order("hint_level", { ascending: true });
  if (res.error) throw new Error(res.error.message);
  return res.data ?? [];
}

const STATUSES: readonly VerificationStatus[] = [
  "COMPLETE",
  "RESULT_CORRECT_SKILL_NOT_DEMONSTRATED",
  "RESULT_INCORRECT_SKILL_DEMONSTRATED",
  "INCOMPLETE",
  "BLOCKED_BY_SAFETY_POLICY",
];
const isStatus = (v: unknown): v is VerificationStatus =>
  typeof v === "string" && (STATUSES as readonly string[]).includes(v);

const stringList = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((i): i is string => typeof i === "string") : [];

const attemptView = (row: AttemptRow | undefined, challengeId: string): AttemptView => ({
  challengeId,
  status: isStatus(row?.status) ? row.status : "INCOMPLETE",
  attempts: row?.attempts ?? 0,
  bestScore: row?.best_score ?? 0,
  xpAwarded: row?.xp_awarded ?? 0,
  completedAt: row?.completed_at ?? null,
});

/** Rebuild the stored verification payload field-by-field (no unsafe casts). */
function verificationFrom(events: ChallengeEventRow[]): Verification | null {
  const ev = [...events].reverse().find((e) => e.kind === "verification");
  if (!ev) return null;
  const v = asRecord(asRecord(ev.payload)["verification"]);
  if (!isStatus(v["status"])) return null;
  const rawObjectives = v["objectives"];
  return {
    status: v["status"],
    objectives: (Array.isArray(rawObjectives) ? rawObjectives : []).map((o) => {
      const r = asRecord(o);
      return { label: asString(r["label"]), met: r["met"] === true, evidence: asString(r["evidence"]) };
    }),
    score: typeof v["score"] === "number" ? v["score"] : 0,
    message: asString(v["message"]),
    remediation: stringList(v["remediation"]),
    wentWell: stringList(v["wentWell"]),
  };
}

/** Rebuild the stored observation payload field-by-field (advisory only). */
function observationFrom(events: ChallengeEventRow[]): Observation | null {
  const ev = [...events].reverse().find((e) => e.kind === "observation");
  if (!ev) return null;
  const o = asRecord(asRecord(ev.payload)["observation"]);
  if (!o["intent"] && !o["coaching"]) return null;
  const understanding = asString(o["conceptUnderstanding"], "partial");
  const category = asString(o["category"]);
  return {
    intent: asString(o["intent"]),
    approach: asString(o["approach"]),
    skillTarget: stringList(o["skillTarget"]).filter(isSkillId),
    category: OBSERVATION_CATEGORIES.find((c) => c === category) ?? null,
    conceptUnderstanding: understanding === "unclear" || understanding === "solid" ? understanding : "partial",
    skillDemonstrated: o["skillDemonstrated"] === true,
    coaching: asString(o["coaching"]),
  };
}

function transcriptFrom(events: ChallengeEventRow[]): TerminalLine[] {
  const lines: TerminalLine[] = [];
  for (const e of events) {
    if (e.kind !== "command") continue;
    const p = asRecord(e.payload);
    const cwdBefore = asString(p["cwdBefore"]);
    lines.push({ kind: "input", text: `${cwdBefore ? `~/${cwdBefore}` : "~"}$ ${asString(p["raw"])}` });
    const rawLines = p["lines"];
    if (!Array.isArray(rawLines)) continue;
    for (const item of rawLines) {
      const l = asRecord(item);
      const kind = asString(l["kind"], "output");
      lines.push({
        kind: kind === "error" ? "error" : kind === "system" ? "system" : "output",
        text: asString(l["text"]),
      });
    }
  }
  return lines.slice(-120);
}

function pickNext(attempts: AttemptRow[], skills: SkillMemoryView[], currentId: string): string | null {

  const byId = new Map(attempts.map((a) => [a.challenge_id, a]));
  const done = (id: string) => byId.get(id)?.status === "COMPLETE";
  const weak = new Set(skills.filter((s) => s.attempts > 0 && s.mastery < 55).map((s) => s.skillId));
  const open = CONTRACTS.filter((c) => !done(c.id) && c.prerequisites.every(done) && c.id !== currentId);
  if (open.length === 0) return CONTRACTS.find((c) => !done(c.id) && c.id !== currentId)?.id ?? null;
  const weakFirst = open.find((c) => c.requiredSkills.some((s) => weak.has(s)));
  return (weakFirst ?? open.sort((a, b) => a.order - b.order)[0])?.id ?? null;
}

/**
 * Initialise-or-restore a mission.
 *
 * Never duplicates learner state: if the requested mission (or, with no
 * request, the learner's story position) already has an attempt row, that row
 * is resumed. A new row is created only when none exists.
 */
export async function startOrRestoreMission(
  db: Db,
  userId: string,
  requestedId?: string,
): Promise<{ challengeId: string; resumed: boolean }> {
  await ensureLab(db, userId);
  const attempts = await loadAttempts(db, userId);
  const done = (id: string) => attempts.find((a) => a.challenge_id === id)?.status === "COMPLETE";

  let challengeId = requestedId && contractById(requestedId) ? requestedId : null;
  if (!challengeId) {
    // Story position: the earliest unlocked, unfinished mission.
    const inProgress = CONTRACTS.find((c) => !done(c.id) && attempts.some((a) => a.challenge_id === c.id));
    const nextOpen = CONTRACTS.filter((c) => !done(c.id) && c.prerequisites.every(done)).sort(
      (a, b) => a.order - b.order,
    )[0];
    challengeId = inProgress?.id ?? nextOpen?.id ?? CONTRACTS[0]!.id;
  }

  const existing = attempts.find((a) => a.challenge_id === challengeId);
  if (existing) return { challengeId, resumed: true };

  const created = await db
    .from("learner_challenge_attempts")
    .insert({ user_id: userId, challenge_id: challengeId, status: "INCOMPLETE" });
  if (created.error && !`${created.error.message}`.includes("duplicate")) throw new Error(created.error.message);
  return { challengeId, resumed: false };
}

export async function loadMissionState(

  db: Db,
  userId: string,
  challengeId: string,
  cwd: string,
  language: Lang,
): Promise<MissionState> {
  void language;
  const contract = contractById(challengeId) ?? CONTRACTS[0]!;
  const lab = await ensureLab(db, userId);
  const [{ views }, attempts, skills, events, progression, chEvents, hintRows] = await Promise.all([
    loadWorld(db, userId, lab.id),
    loadAttempts(db, userId),
    loadSkills(db, userId),
    loadEvents(db, userId),
    loadProgression(db, userId),
    loadChallengeEvents(db, userId, contract.id),
    loadHints(db, userId, contract.id),
  ]);

  const attemptRow = attempts.find((a) => a.challenge_id === contract.id);
  const lastVerification = verificationFrom(chEvents);
  const lastObservation = observationFrom(chEvents);


  const completed = new Set(attempts.filter((a) => a.status === "COMPLETE").map((a) => a.challenge_id));

  return {
    challenge: toBrief(contract),
    context: buildContext({
      contract,
      labTitle: lab.title,
      cwd,
      objects: views,
      events,
      skills,
      attempts: attempts.map((a) => ({
        challengeId: a.challenge_id,
        status: a.status as VerificationStatus,
        score: a.best_score,
        updatedAt: a.updated_at,
      })),
      level: progression.level,
    }),
    attempt: attemptView(attemptRow, contract.id),
    catalogue: CONTRACTS.map((c) => {
      const row = attempts.find((a) => a.challenge_id === c.id);
      return {
        ...toBrief(c),
        attempt: row ? attemptView(row, c.id) : null,
        unlocked: c.prerequisites.every((p) => completed.has(p)),
      };
    }),
    transcript: transcriptFrom(chEvents),
    cwd,
    hints: hintRows.map((h) => ({ level: h.hint_level, text: contract.hints[h.hint_level - 1] ?? "" })),
    hintsRemaining: Math.max(0, contract.hints.length - hintRows.length),
    skills,
    progression: {
      totalXp: progression.total_xp,
      level: progression.level,
      challengesCompleted: progression.challenges_completed,
    },
    lastVerification,
    lastObservation,
    nextChallengeId: pickNext(attempts, skills, contract.id),
  };
}

export async function revealNextHint(db: Db, userId: string, challengeId: string) {
  const contract = contractById(challengeId);
  if (!contract) throw new Error("Unknown mission");
  const used = await loadHints(db, userId, challengeId);
  const level = used.length + 1;
  if (level > contract.hints.length) return { level: used.length, text: contract.hints[used.length - 1] ?? "" };
  const res = await db.from("learner_hint_usage").insert({ user_id: userId, challenge_id: challengeId, hint_level: level });
  if (res.error && !`${res.error.message}`.includes("duplicate")) throw new Error(res.error.message);
  await db.from("learner_challenge_events").insert({
    user_id: userId,
    challenge_id: challengeId,
    kind: "hint",
    payload: { level },
  });
  return { level, text: contract.hints[level - 1] ?? "" };
}

async function updateSkillMemory(
  db: Db,
  userId: string,
  skills: SkillId[],
  opts: { complete: boolean; score: number; hintsUsed: number; mistake: string | null },
) {
  for (const skillId of skills) {
    const cur = await db.from("learner_skill_memory").select("*").eq("user_id", userId).eq("skill_id", skillId).maybeSingle();
    if (cur.error) throw new Error(cur.error.message);
    const row = cur.data;
    const attempts = (row?.attempts ?? 0) + 1;
    const successful = (row?.successful_attempts ?? 0) + (opts.complete ? 1 : 0);
    const prevMastery = row?.mastery ?? 0;
    const mastery = Math.max(0, Math.min(100, Math.round(prevMastery + (opts.complete ? Math.max(6, (opts.score - prevMastery) * 0.4) : -2))));
    const mistakes = [...(row?.recent_mistakes ?? []), ...(opts.mistake ? [opts.mistake] : [])].slice(-5);
    const now = new Date();
    const next = new Date(now.getTime() + (opts.complete ? 7 : 2) * 86400000);
    const payload = {
      user_id: userId,
      skill_id: skillId,
      mastery,
      attempts,
      successful_attempts: successful,
      recent_score: opts.score,
      recent_mistakes: mistakes,
      hint_dependency: Math.min(100, (row?.hint_dependency ?? 0) + opts.hintsUsed * 10),
      last_practiced: now.toISOString(),
      next_review: next.toISOString(),
      confidence: Math.round(mastery * (successful / Math.max(1, attempts))),
    };
    const res = row
      ? await db.from("learner_skill_memory").update(payload).eq("id", row.id)
      : await db.from("learner_skill_memory").insert(payload);
    if (res.error) throw new Error(res.error.message);
  }
}

export async function runLabCommand(
  db: Db,
  userId: string,
  challengeId: string,
  raw: string,
  cwd: string,
  language: Lang,
): Promise<RunResult> {
  const contract = contractById(challengeId);
  if (!contract) throw new Error("Unknown mission");

  // Execution is dispatched through the sandbox provider boundary only. The
  // engine never contains command-execution logic and never touches a host.
  const sessionRes = await ensureLabSession(db, userId);
  if (!sessionRes.ok) throw new Error(`Lab environment unavailable: ${sessionRes.error.message}`);
  const session = sessionRes.value;

  const priorEvents = await loadChallengeEvents(db, userId, challengeId);
  const hintRows = await loadHints(db, userId, challengeId);
  const hintsUsed = hintRows.length;

  const priorCommands: string[] = priorEvents
    .filter((e) => e.kind === "command")
    .flatMap((e) => stringList(asRecord(e.payload)["commands"]));
  const priorLoop = priorEvents.some((e) => e.kind === "command" && asRecord(e.payload)["usedLoop"] === true);

  const dispatched = await executeInLab(db, userId, session, { kind: "raw-shell", data: raw }, cwd, challengeId);
  if (!dispatched.ok) throw new Error(dispatched.error.message);
  const record = dispatched.value;

  // Post-execution observed state, as reported by the provider.
  const world: World = new Map(record.stateAfter.filesystem.objects.map((o) => [o.path, o]));

  const execution = {
    lines: record.chunks.map((c) => ({
      kind: c.stream === "stderr" ? ("error" as const) : c.stream === "system" ? ("system" as const) : ("output" as const),
      text: c.text,
    })),
    cwd: record.cwdAfter,
    blocked: record.blocked,
    evidence: {
      usedLoop: record.method.usedLoopConstruct,
      operations: record.method.effectiveOperations,
      invocations: record.method.invocations,
      commands: record.method.statements,
    },
    mutationCount: record.deltas.filesystem.length,
  };


  const evidence = {
    usedLoop: execution.evidence.usedLoop || priorLoop,
    operations: execution.evidence.operations,
    invocations: execution.evidence.invocations + priorCommands.length,
    commands: [...priorCommands, ...execution.evidence.commands],
  };

  const verification = verify(contract, world, evidence, {
    blockedReason: execution.blocked?.reason ?? null,
    hintsUsed,
  });

  const observation = deterministicObserver.observe({
    contract,
    raw,
    execution,
    verification,
    history: [...priorCommands, ...execution.evidence.commands],
    hintsUsed,
    language,
  });

  await db.from("learner_challenge_events").insert([
    {
      user_id: userId,
      challenge_id: challengeId,
      kind: "command",
      payload: {
        raw,
        cwdBefore: cwd,
        cwdAfter: execution.cwd,
        lines: execution.lines,
        commands: execution.evidence.commands,
        usedLoop: execution.evidence.usedLoop,
        blocked: execution.blocked?.reason ?? null,
      },
    },
    { user_id: userId, challenge_id: challengeId, kind: "observation", payload: { observation } },
    { user_id: userId, challenge_id: challengeId, kind: "verification", payload: { verification } },
  ]);

  // Attempt row + idempotent reward.
  const attemptsRows = await loadAttempts(db, userId);
  const existing = attemptsRows.find((a) => a.challenge_id === challengeId);
  const alreadyComplete = existing?.status === "COMPLETE";
  const nowComplete = verification.status === "COMPLETE";

  const attemptPayload = {
    user_id: userId,
    challenge_id: challengeId,
    status: alreadyComplete ? "COMPLETE" : verification.status,
    attempts: (existing?.attempts ?? 0) + 1,
    best_score: Math.max(existing?.best_score ?? 0, verification.score),
    evidence: { objectives: verification.objectives, usedLoop: evidence.usedLoop },
    completed_at: alreadyComplete ? existing?.completed_at : nowComplete ? new Date().toISOString() : null,
  };

  let xpAwarded = 0;
  if (nowComplete && !alreadyComplete && (existing?.xp_awarded ?? 0) === 0) xpAwarded = contract.xpReward;

  const upsert = existing
    ? await db
        .from("learner_challenge_attempts")
        .update({ ...attemptPayload, xp_awarded: (existing.xp_awarded ?? 0) + xpAwarded })
        .eq("id", existing.id)
    : await db.from("learner_challenge_attempts").insert({ ...attemptPayload, xp_awarded: xpAwarded });
  if (upsert.error) throw new Error(upsert.error.message);

  if (xpAwarded > 0) {
    const progression = await loadProgression(db, userId);
    const totalXp = progression.total_xp + xpAwarded;
    const res = await db
      .from("learner_progression")
      .update({
        total_xp: totalXp,
        level: 1 + Math.floor(totalXp / 500),
        challenges_completed: progression.challenges_completed + 1,
      })
      .eq("user_id", userId);
    if (res.error) throw new Error(res.error.message);
  }

  if (!execution.blocked && (nowComplete || execution.mutationCount > 0)) {
    await db.from("learning_narrative_events").insert({
      user_id: userId,
      challenge_id: challengeId,
      event_type: nowComplete ? "mission_complete" : "world_change",
      summary: nowComplete
        ? `${contract.title} completed — ${contract.successStory}`
        : `Worked in the lab during ${contract.title}: ${execution.evidence.commands.slice(0, 3).join("; ")}`,
      related_skill_ids: contract.requiredSkills,
      importance: nowComplete ? 4 : 2,
    });
  }

  if (!execution.blocked) {
    await updateSkillMemory(db, userId, contract.requiredSkills, {
      complete: nowComplete && !alreadyComplete,
      score: verification.score,
      hintsUsed,
      mistake: observation.category && !nowComplete ? observation.category : null,
    });
  }

  const state = await loadMissionState(db, userId, challengeId, execution.cwd, language);

  const newLines: TerminalLine[] = [
    { kind: "input", text: `${cwd ? `~/${cwd}` : "~"}$ ${raw}` },
    ...execution.lines.map((l) => ({
      kind: l.kind === "error" ? ("error" as const) : l.kind === "system" ? ("system" as const) : ("output" as const),
      text: l.text,
    })),
  ];

  return {
    transcript: newLines,
    cwd: execution.cwd,
    observation,
    verification,
    xpAwarded,
    state,
  };
}
