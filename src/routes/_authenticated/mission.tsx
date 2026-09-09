import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Bot,
  Lightbulb,
  ListChecks,
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
import { getMissionState, revealHint, runCommand } from "@/lib/forge/engine.functions";
import { SKILL_LABELS, type MissionState, type Observation, type TerminalLine, type Verification } from "@/lib/forge/types";
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
          "Run a story mission in the LinuxForge training sandbox: brief, objectives, modelled lab terminal, mentor coaching and a verified result.",
      },
      { property: "og:title", content: "Mission — LinuxForge AI" },
      { property: "og:description", content: "Story missions with verified objectives in a safe training sandbox." },
    ],
  }),
  component: MissionPage,
});

const LANGUAGES = ["English", "Hinglish", "Mix both"] as const;

const STATUS_COPY: Record<string, { label: string; tone: "primary" | "accent" | "signal" | "warn" }> = {
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

  const submit = async () => {
    const raw = command.trim();
    if (!raw || busy || !state) return;
    setBusy(true);
    setCommand("");
    try {
      const result = await runCommand({ data: { challengeId: state.challenge.id, command: raw, cwd, language } });
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
        { kind: "error", text: e instanceof Error ? e.message : "The lab could not run that action." },
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
              hints: [...prev.hints.filter((h) => h.level !== hint.level), hint].sort((a, b) => a.level - b.level),
              hintsRemaining: Math.max(0, prev.hintsRemaining - 1),
            }
          : prev,
      );
    } catch {
      setTranscript((prev) => [...prev, { kind: "error", text: "Hint unavailable right now — try again in a moment." }]);
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <AppShell>
        <PageHeader eyebrow="Story mission" title="Loading your lab" description="Restoring the workspace you built." />
        <LoadingBlock rows={4} />
      </AppShell>
    );
  }

  if (error || !state) {
    return (
      <AppShell>
        <PageHeader eyebrow="Story mission" title="Mission unavailable" />
        <ErrorState description={error ?? "No mission data returned."} onRetry={() => void load()} />
      </AppShell>
    );
  }

  const { challenge, context, attempt, catalogue } = state;
  const statusMeta = STATUS_COPY[verification?.status ?? attempt.status] ?? STATUS_COPY["INCOMPLETE"]!;
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
            <PanelHeader title="Mission brief" icon={<Target className="size-4" />} action={<Tag tone="primary">{challenge.xpReward} XP</Tag>} />
            <p className="text-sm leading-relaxed text-muted-foreground">{challenge.objective}</p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {challenge.requiredSkills.map((s) => (
                <Tag key={s} tone="accent">
                  {SKILL_LABELS[s]}
                </Tag>
              ))}
            </div>
            <p className="mt-4 text-[11px] uppercase tracking-widest text-muted-foreground">Not allowed</p>
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
            {context.relevant_previous_objects.length === 0 && context.relevant_story_events.length === 0 ? (
              <EmptyState title="Your story starts here" description="Objects and events you create will be remembered across missions." />
            ) : (
              <div className="space-y-2 text-xs">
                {context.relevant_previous_objects.map((o) => (
                  <p key={o.objectId} className="rounded-lg border border-border bg-surface-2/50 px-3 py-2 font-mono">
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
                modelled sandbox provider (mock-modelled-v1) · isolated Linux adapter not configured · no host access
              </span>
            </div>
            <div ref={logRef} className="scanline max-h-[360px] flex-1 space-y-1 overflow-y-auto p-5 font-mono text-[13px]">
              {transcript.length === 0 ? (
                <p className="text-muted-foreground/70">
                  This is a modelled training lab, not a real machine. Type help to see the commands it understands.
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
                        l === language ? "border-primary/40 bg-primary/10 text-primary" : "border-border text-muted-foreground",
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
                <p key={h.level} className="rounded-lg border border-accent/30 bg-accent/8 px-3 py-2 text-xs leading-relaxed">
                  <span className="font-mono uppercase tracking-widest text-accent">Hint {h.level}</span> — {h.text}
                </p>
              ))}
              <Button variant="outline" size="sm" onClick={() => void takeHint()} disabled={busy || state.hintsRemaining === 0}>
                <Lightbulb className="size-3.5" />
                {state.hintsRemaining === 0 ? "All hints used" : `Get a hint (${state.hintsRemaining} left)`}
              </Button>
            </div>
          </Panel>

          <Panel>
            <PanelHeader
              title="Result"
              icon={<Trophy className="size-4" />}
              action={<Tag tone={statusMeta.tone}>{statusMeta.label}</Tag>}
            />
            {verification ? (
              <div className="space-y-4">
                <p className="text-sm leading-relaxed text-muted-foreground">{verification.message}</p>
                <div>
                  <div className="mb-1.5 flex justify-between font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                    <span>Grade</span>
                    <span>{verification.score}/100</span>
                  </div>
                  <ProgressBar value={verification.score} />
                </div>
                <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                  XP this run: {xpJustAwarded} · total {state.progression.totalXp} · level {state.progression.level}
                </p>
                {verification.wentWell.length > 0 ? (
                  <div>
                    <p className="text-[11px] uppercase tracking-widest text-muted-foreground">What went well</p>
                    <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                      {verification.wentWell.map((w) => (
                        <li key={w}>✓ {w}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {verification.remediation.length > 0 ? (
                  <div>
                    <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Next step</p>
                    <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                      {verification.remediation.map((r) => (
                        <li key={r}>· {r}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {state.skills.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Skill progress</p>
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
                {verification.status === "COMPLETE" && nextChallenge ? (
                  <Button size="sm" onClick={() => navigate({ to: "/mission", search: { c: nextChallenge } })}>
                    Next mission: {nextChallenge} <ArrowRight className="size-3.5" />
                  </Button>
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
