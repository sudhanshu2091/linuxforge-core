import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Circle,
  Lock,
  PlayCircle,
  Bot,
  Sparkles,
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
import { getMissionState, startMission } from "@/lib/forge/engine.functions";
import { generateAdaptiveExerciseFn } from "@/lib/ai/adaptive.functions";
import type { AdaptiveExercise, MissionState } from "@/lib/forge/types";
import { buildLearningPath, type LearningPathView } from "@/lib/learner/learning-path";

export const Route = createFileRoute("/_authenticated/learn")({
  head: () => ({
    meta: [
      { title: "Learning Paths — LinuxForge AI" },
      {
        name: "description",
        content: "Adaptive Linux and cybersecurity learning paths with hands-on proof.",
      },
    ],
  }),
  component: LearnPage,
});

function StateIcon({ state }: { state: string }) {
  if (state === "done") return <CheckCircle2 className="size-4 text-signal" />;
  if (state === "current") return <PlayCircle className="size-4 text-primary" />;
  return <Lock className="size-4 text-muted-foreground" />;
}

function LearnPage() {
  const navigate = useNavigate();
  const [state, setState] = useState<MissionState | null>(null);
  const [paths, setPaths] = useState<LearningPathView[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [adaptive, setAdaptive] = useState<AdaptiveExercise | null>(null);
  const [generating, setGenerating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await getMissionState({ data: { challengeId: "C01" } });
      setState(next);
      setPaths(buildLearningPath(next.catalogue));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Learning paths could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const open = async (challengeId: string) => {
    try {
      const result = await startMission({ data: { challengeId } });
      await navigate({ to: "/mission", search: { c: result.challengeId } });
    } catch (e) {
      setError(e instanceof Error ? e.message : "That unit could not be opened.");
    }
  };

  if (loading)
    return (
      <AppShell>
        <PageHeader
          eyebrow="Learning paths"
          title="Building your path"
          description="Reading your verified progress."
        />
        <LoadingBlock rows={5} />
      </AppShell>
    );
  if (error || !state)
    return (
      <AppShell>
        <PageHeader eyebrow="Learning paths" title="Learning path unavailable" />
        <ErrorState
          description={error ?? "No learning data returned."}
          onRetry={() => void load()}
        />
      </AppShell>
    );

  const totalCompleted = paths.reduce((n, p) => n + p.completed, 0);
  const totalMapped = paths.reduce((n, p) => n + p.total, 0);
  const next = paths.find((p) => p.currentChallengeId)?.currentChallengeId ?? null;
  const currentUnit = next ? state.catalogue.find((c) => c.id === next) : null;

  return (
    <AppShell>
      <PageHeader
        eyebrow="Adaptive learning paths"
        title="Forge skill, not screen time"
        description="Your path is driven by verified challenge evidence. Complete a drill and the next actionable unit opens automatically."
        actions={
          <Tag tone="signal">
            {totalCompleted}/{totalMapped || 0} mapped units cleared
          </Tag>
        }
      />

      <Panel className="mb-6 border-primary/25 bg-primary/5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold">
              <Sparkles className="size-4 text-primary" /> Continue your forge
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {currentUnit
                ? `${currentUnit.id} · ${currentUnit.title} is the next actionable mission.`
                : "Your mapped missions are complete. Generate a fresh adaptive task to keep training."}
            </p>
          </div>
          {currentUnit ? (
            <Button size="sm" onClick={() => void open(currentUnit.id)}>
              Continue <ChevronRight className="size-3.5" />
            </Button>
          ) : (
            <Button
              size="sm"
              disabled={generating}
              onClick={async () => {
                setGenerating(true);
                setError(null);
                try {
                  setAdaptive(await generateAdaptiveExerciseFn({ data: { kind: "task" } }));
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Generation failed.");
                } finally {
                  setGenerating(false);
                }
              }}
            >
              {generating ? "Generating…" : "Generate next task"}
            </Button>
          )}
        </div>
        {adaptive?.launchableId && (
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface/70 p-3">
            <span className="text-xs text-muted-foreground">Generated: {adaptive.title}</span>
            <Button size="sm" variant="outline" onClick={() => void open(adaptive.launchableId!)}>
              Open in lab
            </Button>
          </div>
        )}
      </Panel>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {paths.map((track) => (
          <Panel key={track.id} className="transition-colors hover:border-border-strong">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold">{track.name}</h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {track.description}
                </p>
              </div>
              <Tag
                tone={track.progress === 100 ? "signal" : track.progress > 0 ? "accent" : "primary"}
              >
                {track.level}
              </Tag>
            </div>
            <div className="mt-4 flex items-center justify-between text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
              <span>
                {track.completed}/{track.total || 0} proven
              </span>
              <span>{track.progress}%</span>
            </div>
            <ProgressBar
              className="mt-2"
              value={track.progress}
              tone={track.progress ? "accent" : "primary"}
            />
            <div className="mt-4 flex items-center justify-between">
              {track.currentChallengeId ? (
                <span className="text-xs text-muted-foreground">
                  Next: {track.currentChallengeId}
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">
                  {track.total ? "Track cleared" : "Coming through the evidence model"}
                </span>
              )}
              {track.currentChallengeId && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void open(track.currentChallengeId!)}
                >
                  Open <ChevronRight className="size-3.5" />
                </Button>
              )}
            </div>
          </Panel>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Panel>
          <PanelHeader
            title="How a unit works"
            subtitle="Concept → drill → proof → progression"
            icon={<BookOpen className="size-4" />}
          />
          <ul className="divide-y divide-border">
            <li className="flex gap-3 py-3">
              <Circle className="mt-0.5 size-4 text-primary" />
              <div>
                <p className="text-sm font-medium">Learn the concept</p>
                <p className="text-xs text-muted-foreground">
                  Short explanations stay focused on what you need for the next action.
                </p>
              </div>
            </li>
            <li className="flex gap-3 py-3">
              <PlayCircle className="mt-0.5 size-4 text-primary" />
              <div>
                <p className="text-sm font-medium">Prove it in the lab</p>
                <p className="text-xs text-muted-foreground">
                  The challenge evaluates the workspace and the approach, not just a hardcoded
                  output.
                </p>
              </div>
            </li>
            <li className="flex gap-3 py-3">
              <CheckCircle2 className="mt-0.5 size-4 text-signal" />
              <div>
                <p className="text-sm font-medium">Carry evidence forward</p>
                <p className="text-xs text-muted-foreground">
                  Previous objects, mistakes and skill evidence can influence what comes next.
                </p>
              </div>
            </li>
          </ul>
        </Panel>
        <div className="space-y-6">
          <Panel>
            <PanelHeader title="Need help?" icon={<Bot className="size-4" />} />
            <p className="text-sm leading-relaxed text-muted-foreground">
              Your mentor can re-teach a concept, explain an error or give an escalating hint
              without taking over the lab.
            </p>
            <Link to="/tutor" className={buttonClass({ size: "sm" }) + " mt-4 w-full"}>
              Ask the tutor
            </Link>
          </Panel>
          <Panel>
            <PanelHeader title="Open the full challenge board" />
            <p className="text-sm text-muted-foreground">
              Jump from the learning path into story missions whenever you want more hands-on
              practice.
            </p>
            <Link
              to="/challenges"
              className={buttonClass({ variant: "outline", size: "sm" }) + " mt-4 w-full"}
            >
              View challenges
            </Link>
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}
