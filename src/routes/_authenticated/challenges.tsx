import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Clock, Filter, Lightbulb, ListChecks, ShieldCheck, Swords, Trophy } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import {
  Button,
  FutureSurface,
  FutureTag,
  PageHeader,
  Panel,
  PanelHeader,
  Tag,
  buttonClass,
} from "@/components/kit/primitives";
import { EmptyState, ErrorState, LoadingBlock } from "@/components/kit/states";
import { getMissionState, startMission } from "@/lib/forge/engine.functions";
import type { MissionState } from "@/lib/forge/types";


export const Route = createFileRoute("/_authenticated/challenges")({
  head: () => ({
    meta: [
      { title: "Challenges — LinuxForge AI" },
      {
        name: "description",
        content: "Applied Linux and blue-team lab missions with verifiable objectives, all inside a safe sandbox.",
      },
      { property: "og:title", content: "Challenges — LinuxForge AI" },
      { property: "og:description", content: "Applied Linux and blue-team lab missions with verifiable objectives." },
    ],
  }),
  component: ChallengesPage,
});

const filters = ["All", "Filesystem", "Processes", "Networking", "Logs", "Hardening"];

type CatalogueEntry = MissionState["catalogue"][number];

const toneFor = (difficulty: number) =>
  difficulty >= 3 ? ("signal" as const) : difficulty === 2 ? ("accent" as const) : ("primary" as const);

const levelFor = (difficulty: number) =>
  difficulty >= 4 ? "Specialist" : difficulty === 3 ? "Operator" : "Recruit";

function ChallengesPage() {
  const navigate = useNavigate();
  const [catalogue, setCatalogue] = useState<CatalogueEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setCatalogue(null);
    try {
      const state = await getMissionState({ data: { challengeId: "C01" } });
      setCatalogue(state.catalogue);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Missions could not be loaded right now.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const start = async (challengeId: string) => {
    setStarting(challengeId);
    try {
      const res = await startMission({ data: { challengeId } });
      await navigate({ to: "/mission", search: { c: res.challengeId } });
    } catch (e) {
      setError(e instanceof Error ? e.message : "That mission could not be opened right now.");
    } finally {
      setStarting(null);
    }
  };

  return (
    <AppShell>
      <PageHeader
        eyebrow="Lab missions"
        title="Challenges that ask you to reason, then prove it"
        description="Scenario-based missions with checkable objectives. Hints cost a little XP, so thinking first pays."
        actions={<Tag tone="signal"><ShieldCheck className="size-3" /> Sandboxed, defensive scope</Tag>}
      />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          <Filter className="size-3.5" /> Filter
        </span>
        {filters.map((f, i) => (
          <button
            key={f}
            className={
              "rounded-lg border px-3 py-1.5 text-xs transition-colors " +
              (i === 0
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border bg-surface/60 text-muted-foreground hover:text-foreground")
            }
          >
            {f}
          </button>
        ))}
        <FutureTag className="ml-auto" label="Filtering later" />
      </div>

      {error ? (
        <ErrorState description={error} onRetry={() => void load()} />
      ) : !catalogue ? (
        <LoadingBlock />
      ) : catalogue.length === 0 ? (
        <EmptyState title="No missions available" description="Your mission catalogue is empty right now." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {catalogue.map((m) => {
            const status = m.attempt?.status ?? null;
            const complete = status === "COMPLETE";
            return (
              <Panel key={m.id} className="flex flex-col transition-colors hover:border-border-strong">
                <div className="flex items-start justify-between gap-3">
                  <span className="flex size-9 items-center justify-center rounded-lg border border-border bg-surface-2 text-primary">
                    <Swords className="size-4" />
                  </span>
                  <Tag tone={complete ? "signal" : toneFor(m.difficulty)}>
                    {complete ? "Complete" : levelFor(m.difficulty)}
                  </Tag>
                </div>
                <h3 className="mt-4 text-sm font-semibold">
                  <span className="font-mono text-xs text-muted-foreground">{m.id}</span> · {m.title}
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{m.objective}</p>
                <div className="mt-4 flex items-center gap-4 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <Trophy className="size-3.5" /> {m.xpReward} XP
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="size-3.5" /> {m.attempt?.attempts ?? 0} attempts
                  </span>
                </div>
                {!m.unlocked && (
                  <p className="mt-3 text-[11px] text-muted-foreground">
                    Unlocks after {m.prerequisites.join(", ")}.
                  </p>
                )}
                <Button
                  variant={complete ? "ghost" : "outline"}
                  size="sm"
                  className="mt-5 w-full"
                  disabled={!m.unlocked || starting !== null}
                  onClick={() => void start(m.id)}
                >
                  {starting === m.id
                    ? "Opening…"
                    : complete
                      ? "Revisit mission"
                      : m.attempt
                        ? "Resume mission"
                        : "Start mission"}
                </Button>
              </Panel>
            );
          })}
        </div>
      )}


      {/* Single challenge shell */}
      <div className="mt-10">
        <h2 className="mb-4 font-display text-lg font-semibold">Mission workspace layout</h2>
        <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
          <div className="space-y-6">
            <Panel>
              <PanelHeader
                title="Permissions rescue"
                subtitle="Recruit · Filesystem · 120 XP"
                icon={<Swords className="size-4" />}
                action={<Tag tone="primary">Brief</Tag>}
              />
              <p className="text-sm leading-relaxed text-muted-foreground">
                A teammate loosened permissions across a shared project folder while debugging. Restore a sane setup
                without breaking the team's access.
              </p>
            </Panel>

            <Panel>
              <PanelHeader title="Objectives" icon={<ListChecks className="size-4" />} action={<FutureTag label="Checks later" />} />
              <ul className="space-y-2.5">
                {[
                  "notes.txt readable by owner and group only",
                  "scripts/ executable by owner",
                  "no file world-writable",
                ].map((o) => (
                  <li key={o} className="flex items-start gap-2.5 rounded-lg border border-border bg-surface-2/50 px-3 py-2 text-sm">
                    <span className="mt-1 size-3.5 shrink-0 rounded-full border border-border-strong" />
                    {o}
                  </li>
                ))}
              </ul>
            </Panel>

            <Panel>
              <PanelHeader title="Hints" subtitle="Each hint costs a little XP" icon={<Lightbulb className="size-4" />} />
              <div className="space-y-2">
                {["Nudge — 10 XP", "Direction — 25 XP", "Walkthrough — 60 XP"].map((h) => (
                  <button
                    key={h}
                    className="flex w-full items-center justify-between rounded-lg border border-dashed border-border-strong bg-surface/50 px-3 py-2.5 text-xs text-muted-foreground hover:text-foreground"
                  >
                    {h}
                    <span className="font-mono uppercase tracking-widest">Locked</span>
                  </button>
                ))}
              </div>
            </Panel>
          </div>

          <div className="space-y-6">
            <Panel padded={false} className="overflow-hidden">
              <div className="flex items-center gap-2 border-b border-border bg-surface-2/70 px-4 py-3">
                <span className="size-2.5 rounded-full bg-destructive/70" />
                <span className="size-2.5 rounded-full bg-warn/70" />
                <span className="size-2.5 rounded-full bg-signal/70" />
                <span className="ml-3 font-mono text-xs text-muted-foreground">sandbox — read only preview</span>
              </div>
              <div className="scanline min-h-64 space-y-1.5 p-5 font-mono text-[13px]">
                <p className="text-muted-foreground">
                  <span className="text-signal">learner@forge</span>:<span className="text-accent">~/project</span>$
                </p>
                <p className="text-muted-foreground/70">Interactive shell arrives with the sandbox integration.</p>
              </div>
            </Panel>
            <FutureSurface
              title="Automatic objective verification"
              description="Objective checks and XP awards run in the sandbox layer, added in a later stage."
            />
            <div className="flex flex-wrap gap-2">
              <Link to="/tutor" className={buttonClass({ variant: "outline", size: "sm" })}>
                Ask mentor for a nudge
              </Link>
              <Link to="/terminal" className={buttonClass({ variant: "ghost", size: "sm" })}>
                Open full terminal page
              </Link>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
