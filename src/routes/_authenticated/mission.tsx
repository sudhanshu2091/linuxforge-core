import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Bot,
  Lightbulb,
  ListChecks,
  MessageCircle,
  Loader2,
  ShieldCheck,
  SquareTerminal,
  Target,
  Trophy,
} from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import {
  Button,
  PageHeader,
  Panel,
  PanelHeader,
  ProgressBar,
  Tag,
  buttonClass,
} from "@/components/kit/primitives";
import { EmptyState, ErrorState, LoadingBlock } from "@/components/kit/states";
import {
  assessMission,
  getMissionState,
  revealHint,
  runCommand,
} from "@/lib/forge/engine.functions";
import { generateAdaptiveExerciseFn } from "@/lib/ai/adaptive.functions";
import { askMissionTutor } from "@/lib/ai/tutor.functions";
import type { AdaptiveExercise } from "@/lib/forge/types";
import {
  SKILL_LABELS,
  type MissionAssessment,
  type MissionState,
  type Observation,
  type TerminalLine,
  type Verification,
} from "@/lib/forge/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/mission")({
  validateSearch: (search: Record<string, unknown>) => ({
    c: typeof search["c"] === "string" ? (search["c"] as string) : "C01",
  }),
  head: () => ({
    meta: [
      { title: "Mission — LinuxForge AI" },
      {
        name: "description",
        content:
          "Run a story mission in the LinuxForge training sandbox: brief, objectives, an authenticated lab terminal, mentor coaching and a verified result.",
      },
      { property: "og:title", content: "Mission — LinuxForge AI" },
      {
        property: "og:description",
        content: "Story missions with verified objectives in a safe training sandbox.",
      },
    ],
  }),
  component: MissionPage,
});

const LANGUAGES = ["English", "Hinglish", "Mix both"] as const;

const STATUS_COPY: Record<
  string,
  { label: string; tone: "primary" | "accent" | "signal" | "warn" }
> = {
  COMPLETE: { label: "Complete", tone: "signal" },
  RESULT_CORRECT_SKILL_NOT_DEMONSTRATED: { label: "Right result, skill not shown", tone: "warn" },
  RESULT_INCORRECT_SKILL_DEMONSTRATED: { label: "Skill shown, wrong target", tone: "warn" },
  INCOMPLETE: { label: "In progress", tone: "accent" },
  BLOCKED_BY_SAFETY_POLICY: { label: "Blocked by lab safety", tone: "warn" },
};

function MissionPage() {
  const { c } = Route.useSearch();
  const navigate = useNavigate();

  const [state, setState] = useState<MissionState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cwd, setCwd] = useState("");
  const [command, setCommand] = useState("");
  const [transcript, setTranscript] = useState<TerminalLine[]>([]);
  const [verification, setVerification] = useState<Verification | null>(null);
  const [observation, setObservation] = useState<Observation | null>(null);
  const [xpJustAwarded, setXpJustAwarded] = useState(0);
  const [language, setLanguage] = useState<(typeof LANGUAGES)[number]>("Mix both");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [generatingNext, setGeneratingNext] = useState(false);
  const [generatedNext, setGeneratedNext] = useState<AdaptiveExercise | null>(null);
  const [assessment, setAssessment] = useState<MissionAssessment | null>(null);
  const [assessing, setAssessing] = useState(false);
  const [tutorQuestion, setTutorQuestion] = useState("");
  const [tutorReplyText, setTutorReplyText] = useState<string | null>(null);
  const [tutorBusy, setTutorBusy] = useState(false);
  const logRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await getMissionState({ data: { challengeId: c, cwd: "", language } });
      setState(next);
      setCwd(next.cwd);
      setTranscript(next.transcript);
      setVerification(next.lastVerification);
      setObservation(next.lastObservation);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The lab could not be loaded right now.");
    } finally {
      setLoading(false);
    }
    // language is only a presentation preference for coaching text
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [transcript]);

  useEffect(() => {
    if (!state?.attempt.startedAt || state.attempt.completedAt) return;
    const started = new Date(state.attempt.startedAt).getTime();
    const tick = () => setElapsedSeconds(Math.max(0, Math.floor((Date.now() - started) / 1000)));
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [state?.attempt.startedAt, state?.attempt.completedAt]);

  const submit = async () => {
    const raw = command.trim();
    if (!raw || busy || !state) return;
    setBusy(true);
    setCommand("");
    setAssessment(null);
    try {
      const result = await runCommand({
        data: { challengeId: state.challenge.id, command: raw, cwd, language },
      });
      if (result.transcript.some((l) => l.text === "__clear__")) setTranscript([]);
      else setTranscript((prev) => [...prev, ...result.transcript].slice(-160));
      setCwd(result.cwd);
      setVerification(result.verification);
      setObservation(result.observation);
      setXpJustAwarded(result.xpAwarded);
      setState(result.state);
    } catch (e) {
      setTranscript((prev) => [
        ...prev,
        {
          kind: "error",
          text: e instanceof Error ? e.message : "The lab could not run that action.",
        },
      ]);
    } finally {
      setBusy(false);
    }
  };

  const takeHint = async () => {
    if (!state || busy) return;
    setBusy(true);
    try {
      const hint = await revealHint({ data: { challengeId: state.challenge.id } });
      setState((prev) =>
        prev
          ? {
              ...prev,
              hints: [...prev.hints.filter((h) => h.level !== hint.level), hint].sort(
                (a, b) => a.level - b.level,
              ),
              hintsRemaining: Math.max(0, prev.hintsRemaining - 1),
            }
          : prev,
      );
    } catch {
      setTranscript((prev) => [
        ...prev,
        { kind: "error", text: "Hint unavailable right now — try again in a moment." },
      ]);
    } finally {
      setBusy(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remaining = seconds % 60;
    return `${minutes}m ${remaining.toString().padStart(2, "0")}s`;
  };

  const generateNextMission = async () => {
    if (generatingNext) return;
    setGeneratingNext(true);
    try {
      setGeneratedNext(await generateAdaptiveExerciseFn({ data: { kind: "mission" } }));
    } catch (e) {
      setTranscript((prev) => [
        ...prev,
        {
          kind: "error",
          text: e instanceof Error ? e.message : "Adaptive mission generation failed.",
        },
      ]);
    } finally {
      setGeneratingNext(false);
    }
  };

  const askMissionMentor = async (preset?: string) => {
    if (!state || tutorBusy) return;
    const message = (preset ?? tutorQuestion).trim();
    if (!message) return;
    setTutorQuestion("");
    setTutorBusy(true);
    try {
      const result = await askMissionTutor({
        data: {
          challengeId: state.challenge.id,
          message,
          language,
          depth: "Balanced",
        },
      });
      setTutorReplyText(result.reply);
    } catch (e) {
      setTutorReplyText(e instanceof Error ? e.message : "Mentor is unavailable right now.");
    } finally {
      setTutorBusy(false);
    }
  };

  const runAssessment = async () => {
    if (!state || assessing) return;
    setAssessing(true);
    try {
      setAssessment(await assessMission({ data: { challengeId: state.challenge.id } }));
    } catch (e) {
      setTranscript((prev) => [
        ...prev,
        {
          kind: "error",
          text: e instanceof Error ? e.message : "Assessment is unavailable right now.",
        },
      ]);
    } finally {
      setAssessing(false);
    }
  };

  if (loading) {
    return (
      <AppShell>
        <PageHeader
          eyebrow="Story mission"
          title="Loading your lab"
          description="Restoring the workspace you built."
        />
        <LoadingBlock rows={4} />
      </AppShell>
    );
  }

  if (error || !state) {
    return (
      <AppShell>
        <PageHeader eyebrow="Story mission" title="Mission unavailable" />
        <ErrorState
          description={error ?? "No mission data returned."}
          onRetry={() => void load()}
        />
      </AppShell>
    );
  }

  const { challenge, context, attempt, catalogue } = state;
  const statusMeta =
    STATUS_COPY[verification?.status ?? attempt.status] ?? STATUS_COPY["INCOMPLETE"]!;
  const nextChallenge = state.nextChallengeId;

  return (
    <AppShell>
      <PageHeader
        eyebrow={`Mission ${challenge.id} · Story arc`}
        title={challenge.title}
        description={challenge.storyIntro}
        actions={
          <>
            <Tag tone="signal">
              <ShieldCheck className="size-3" /> Modelled training sandbox · not real Linux
            </Tag>
            <Tag tone={statusMeta.tone}>{statusMeta.label}</Tag>
          </>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Link to="/challenges" className={buttonClass({ variant: "ghost", size: "sm" })}>
          Back to challenges
        </Link>
        {catalogue.map((item) => (
          <button
            key={item.id}
            disabled={!item.unlocked}
            onClick={() => navigate({ to: "/mission", search: { c: item.id } })}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-xs transition-colors",
              item.id === challenge.id
                ? "border-primary/40 bg-primary/10 text-primary"
                : item.unlocked
                  ? "border-border bg-surface/60 text-muted-foreground hover:text-foreground"
                  : "cursor-not-allowed border-border/60 bg-surface/30 text-muted-foreground/50",
            )}
          >
            {item.id}
            {item.attempt?.status === "COMPLETE" ? " ✓" : ""}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.25fr]">
        <div className="space-y-6">
          <Panel>
            <PanelHeader
              title="Mission brief"
              icon={<Target className="size-4" />}
              action={
                <div className="flex items-center gap-2">
                  <Tag tone="primary">{challenge.xpReward} XP</Tag>
                  <Tag tone="accent">{formatDuration(elapsedSeconds)}</Tag>
                </div>
              }
            />
            <p className="text-sm leading-relaxed text-muted-foreground">{challenge.objective}</p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {challenge.requiredSkills.map((s) => (
                <Tag key={s} tone="accent">
                  {SKILL_LABELS[s]}
                </Tag>
              ))}
            </div>
            <p className="mt-4 text-[11px] uppercase tracking-widest text-muted-foreground">
              Not allowed
            </p>
            <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
              {challenge.bannedShortcuts.map((b) => (
                <li key={b}>· {b}</li>
              ))}
            </ul>
          </Panel>

          <Panel>
            <PanelHeader title="Objectives" icon={<ListChecks className="size-4" />} />
            {verification ? (
              <ul className="space-y-2.5">
                {verification.objectives.map((o) => (
                  <li
                    key={o.label}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-sm",
                      o.met ? "border-signal/35 bg-signal/8" : "border-border bg-surface-2/50",
                    )}
                  >
                    <p className="font-medium">
                      {o.met ? "✓" : "○"} {o.label}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{o.evidence}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                title="Nothing checked yet"
                description="Run something in the lab and the objectives will be verified against the actual workspace."
                icon={<ListChecks className="size-4" />}
              />
            )}
          </Panel>

          <Panel>
            <PanelHeader
              title="Story so far"
              subtitle="What this mission builds on"
              icon={<BookOpen className="size-4" />}
            />
            {context.relevant_previous_objects.length === 0 &&
            context.relevant_story_events.length === 0 ? (
              <EmptyState
                title="Your story starts here"
                description="Objects and events you create will be remembered across missions."
              />
            ) : (
              <div className="space-y-2 text-xs">
                {context.relevant_previous_objects.map((o) => (
                  <p
                    key={o.objectId}
                    className="rounded-lg border border-border bg-surface-2/50 px-3 py-2 font-mono"
                  >
                    {o.path}
                    {o.objectType === "directory" ? "/" : ""} · {o.permissions}
                    {o.createdByChallenge ? ` · from ${o.createdByChallenge}` : ""}
                  </p>
                ))}
                {context.relevant_story_events.map((e) => (
                  <p key={e.eventId} className="text-muted-foreground">
                    · {e.summary}
                  </p>
                ))}
              </div>
            )}
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel padded={false} className="flex min-h-[420px] flex-col overflow-hidden">
            <div className="flex items-center gap-2 border-b border-border bg-surface-2/70 px-4 py-3">
              <SquareTerminal className="size-4 text-primary" />
              <span className="font-mono text-xs text-muted-foreground">
                LinuxForge lab terminal · isolated runtime boundary · no host access
              </span>
            </div>
            <div
              ref={logRef}
              className="scanline max-h-[360px] flex-1 space-y-1 overflow-y-auto p-5 font-mono text-[13px]"
            >
              {transcript.length === 0 ? (
                <p className="text-muted-foreground/70">
                  Use the LinuxForge lab terminal to complete the mission. Type help to inspect the
                  available environment when supported.
                </p>
              ) : (
                transcript.map((l, i) => (
                  <p
                    key={i}
                    className={cn(
                      l.kind === "input" && "text-foreground",
                      l.kind === "error" && "text-destructive",
                      l.kind === "system" && "text-accent",
                      l.kind === "output" && "text-muted-foreground",
                    )}
                  >
                    {l.text}
                  </p>
                ))
              )}
            </div>
            <div className="flex items-center gap-2 border-t border-border p-3">
              <span className="font-mono text-xs text-signal">~{cwd ? `/${cwd}` : ""}$</span>
              <input
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void submit();
                }}
                placeholder="mkdir project"
                aria-label="Lab command"
                className="h-10 flex-1 rounded-lg border border-input bg-surface/60 px-3 font-mono text-sm outline-none focus-visible:border-primary/50"
              />
              <Button size="sm" onClick={() => void submit()} disabled={busy || !command.trim()}>
                {busy ? <Loader2 className="size-3.5 animate-spin" /> : "Run"}
              </Button>
            </div>
          </Panel>

          <Panel>
            <PanelHeader
              title="Mentor coaching"
              subtitle="Escalating hints — concept first, solution last"
              icon={<Bot className="size-4" />}
              action={
                <div className="flex gap-1">
                  {LANGUAGES.map((l) => (
                    <button
                      key={l}
                      onClick={() => setLanguage(l)}
                      className={cn(
                        "rounded-md border px-2 py-1 text-[11px]",
                        l === language
                          ? "border-primary/40 bg-primary/10 text-primary"
                          : "border-border text-muted-foreground",
                      )}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              }
            />
            {observation ? (
              <p className="rounded-lg border border-border bg-surface-2/50 px-3 py-2.5 text-sm leading-relaxed">
                {observation.coaching}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Try the mission first. I will watch what you do in the lab and coach from there.
              </p>
            )}

            <div className="mt-4 space-y-2">
              {state.hints.map((h) => (
                <p
                  key={h.level}
                  className="rounded-lg border border-accent/30 bg-accent/8 px-3 py-2 text-xs leading-relaxed"
                >
                  <span className="font-mono uppercase tracking-widest text-accent">
                    Hint {h.level}
                    {h.stage ? ` · ${h.stage}` : ""}
                  </span>{" "}
                  — {h.text}
                  {h.teachingNote ? (
                    <span className="mt-1 block text-muted-foreground">{h.teachingNote}</span>
                  ) : null}
                </p>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => void takeHint()}
                disabled={busy || state.hintsRemaining === 0}
              >
                <Lightbulb className="size-3.5" />
                {state.hintsRemaining === 0
                  ? "All hints used"
                  : `Get a hint (${state.hintsRemaining} left)`}
              </Button>
            </div>
          </Panel>

          <Panel>
            <PanelHeader
              title="Ask Forge Mentor"
              subtitle="Context-aware coaching from this mission's observed evidence"
              icon={<MessageCircle className="size-4" />}
            />
            <div className="flex flex-wrap gap-2">
              {[
                "What should I try next?",
                "Why did my last command fail?",
                "Give me a hint, not the answer",
              ].map((preset) => (
                <button
                  key={preset}
                  onClick={() => void askMissionMentor(preset)}
                  disabled={tutorBusy}
                  className="rounded-lg border border-border bg-surface-2/50 px-3 py-2 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
                >
                  {preset}
                </button>
              ))}
            </div>
            {tutorReplyText ? (
              <p className="mt-3 rounded-xl border border-primary/25 bg-primary/5 px-3 py-3 text-sm leading-relaxed">
                {tutorReplyText}
              </p>
            ) : null}
            <div className="mt-3 flex gap-2">
              <input
                value={tutorQuestion}
                onChange={(e) => setTutorQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void askMissionMentor();
                }}
                placeholder="Ask about this exact mission…"
                aria-label="Ask Forge Mentor about this mission"
                className="h-10 flex-1 rounded-lg border border-input bg-surface/60 px-3 text-sm outline-none focus-visible:border-primary/50"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => void askMissionMentor()}
                disabled={tutorBusy || !tutorQuestion.trim()}
              >
                {tutorBusy ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <MessageCircle className="size-3.5" />
                )}
                Ask
              </Button>
            </div>
          </Panel>

          <Panel>
            <PanelHeader
              title="Assessment report"
              subtitle="Deterministic evidence summary — verifier remains the final authority"
              icon={<BarChart3 className="size-4" />}
              action={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void runAssessment()}
                  disabled={assessing}
                >
                  {assessing ? <Loader2 className="size-3.5 animate-spin" /> : "Assess run"}
                </Button>
              }
            />
            {assessment ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    ["Grade", `${assessment.grade}/100`],
                    ["Objectives", `${assessment.objectivesMet}/${assessment.objectivesTotal}`],
                    ["Commands", String(assessment.commandCount)],
                    [
                      "Mistakes",
                      String(
                        assessment.mistakeBreakdown.reduce((sum, item) => sum + item.count, 0),
                      ),
                    ],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="rounded-lg border border-border bg-surface-2/50 p-3"
                    >
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                        {label}
                      </p>
                      <p className="mt-1 font-mono text-lg font-semibold">{value}</p>
                    </div>
                  ))}
                </div>
                {assessment.adaptivePlan ? (
                  <div className="rounded-xl border border-primary/25 bg-primary/5 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-[11px] uppercase tracking-widest text-primary">
                          Adaptive next step
                        </p>
                        <p className="mt-1 text-sm font-semibold">
                          {assessment.adaptivePlan.learnerMessage}
                        </p>
                      </div>
                      <Tag tone="primary">
                        Difficulty {assessment.adaptivePlan.desiredDifficulty}/5
                      </Tag>
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                      {assessment.adaptivePlan.rationale}
                    </p>
                    {assessment.adaptivePlan.focusSkills.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {assessment.adaptivePlan.focusSkills.map((skill) => (
                          <Tag key={skill} tone="accent">
                            {SKILL_LABELS[skill]}
                          </Tag>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <Tag tone="accent">{assessment.learningSignal.replace(/_/g, " ")}</Tag>
                  <Tag tone="primary">{assessment.hintsUsed} hints</Tag>
                  <Tag tone="primary">{assessment.mutationOperations} mutations</Tag>
                  {assessment.elapsedSeconds !== null ? (
                    <Tag tone="primary">{formatDuration(assessment.elapsedSeconds)}</Tag>
                  ) : null}
                  {assessment.usedLoop ? <Tag tone="signal">Loop demonstrated</Tag> : null}
                </div>
                {assessment.mistakeBreakdown.length > 0 ? (
                  <div>
                    <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
                      Observed mistake patterns
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {assessment.mistakeBreakdown.map((item) => (
                        <Tag key={item.category} tone="warn">
                          {item.category.replace(/_/g, " ")} ×{item.count}
                        </Tag>
                      ))}
                    </div>
                  </div>
                ) : null}
                {assessment.strengths.length > 0 ? (
                  <div>
                    <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
                      Evidence-backed strengths
                    </p>
                    <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                      {assessment.strengths.map((item) => (
                        <li key={item}>✓ {item}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {assessment.nextActions.length > 0 ? (
                  <div>
                    <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
                      Recommended next actions
                    </p>
                    <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                      {assessment.nextActions.map((item) => (
                        <li key={item}>· {item}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : (
              <EmptyState
                title="No assessment report yet"
                description="Run the mission first, then assess the persisted execution evidence to see mistakes, strengths, effort and learning signals together."
                icon={<BarChart3 className="size-4" />}
              />
            )}
          </Panel>

          <Panel>
            <PanelHeader
              title="Result"
              icon={<Trophy className="size-4" />}
              action={<Tag tone={statusMeta.tone}>{statusMeta.label}</Tag>}
            />
            {verification ? (
              <div className="space-y-4">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {verification.message}
                </p>
                <div>
                  <div className="mb-1.5 flex justify-between font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                    <span>Grade</span>
                    <span>{verification.score}/100</span>
                  </div>
                  <ProgressBar value={verification.score} />
                </div>
                <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                  XP this run: {xpJustAwarded} · total {state.progression.totalXp} · level{" "}
                  {state.progression.level}
                </p>
                {verification.wentWell.length > 0 ? (
                  <div>
                    <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
                      What went well
                    </p>
                    <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                      {verification.wentWell.map((w) => (
                        <li key={w}>✓ {w}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {verification.remediation.length > 0 ? (
                  <div>
                    <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
                      Next step
                    </p>
                    <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                      {verification.remediation.map((r) => (
                        <li key={r}>· {r}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {state.skills.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
                      Skill progress
                    </p>
                    {state.skills.map((s) => (
                      <div key={s.skillId}>
                        <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                          <span>{SKILL_LABELS[s.skillId] ?? s.skillId}</span>
                          <span>{s.mastery}%</span>
                        </div>
                        <ProgressBar value={s.mastery} />
                      </div>
                    ))}
                  </div>
                ) : null}
                {verification.status === "COMPLETE" ? (
                  <div className="rounded-xl border border-signal/30 bg-signal/5 p-4">
                    <p className="text-sm font-semibold text-signal">Mission cleared.</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      The verifier accepted the objective and the result is now part of your learner
                      model.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {nextChallenge ? (
                        <Button
                          size="sm"
                          onClick={() => navigate({ to: "/mission", search: { c: nextChallenge } })}
                        >
                          Continue to {nextChallenge} <ArrowRight className="size-3.5" />
                        </Button>
                      ) : null}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void generateNextMission()}
                        disabled={generatingNext}
                      >
                        {generatingNext ? "Generating…" : "Generate adaptive mission"}
                      </Button>
                      <Link
                        to="/terminal"
                        className={buttonClass({ variant: "ghost", size: "sm" })}
                      >
                        Free practice terminal
                      </Link>
                    </div>
                    {generatedNext?.launchableId ? (
                      <div className="mt-3 rounded-lg border border-border bg-surface/60 p-3">
                        <p className="text-xs font-semibold">{generatedNext.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {generatedNext.objective}
                        </p>
                        <Button
                          size="sm"
                          className="mt-3"
                          onClick={() =>
                            navigate({ to: "/mission", search: { c: generatedNext.launchableId! } })
                          }
                        >
                          Launch generated mission <ArrowRight className="size-3.5" />
                        </Button>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : (
              <EmptyState
                title="No result yet"
                description="Your grade, XP and skill movement appear here once the lab has something to verify."
                icon={<Trophy className="size-4" />}
              />
            )}
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}
