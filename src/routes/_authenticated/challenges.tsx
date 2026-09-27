import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, ChevronRight, Infinity as InfinityIcon, Lock, Map, Sparkles, Swords, Trophy } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { Button, PageHeader, Panel, PanelHeader, Tag } from "@/components/kit/primitives";
import { EmptyState, ErrorState, LoadingBlock } from "@/components/kit/states";
import { getMissionState, startMission } from "@/lib/forge/engine.functions";
import { generateAdaptiveExerciseFn } from "@/lib/ai/adaptive.functions";
import { buildMissionLevels, MISSION_TOPICS, type MissionMode, type MissionTopicId } from "@/lib/forge/mission-curriculum";
import type { MissionState } from "@/lib/forge/types";

export const Route = createFileRoute("/_authenticated/challenges")({
  head: () => ({
    meta: [
      { title: "Missions — LinuxForge AI" },
      { name: "description", content: "Choose a LinuxForge topic, then train through Levels 1–50 or unlimited Infinity practice." },
    ],
  }),
  component: ChallengesPage,
});

type CatalogueEntry = MissionState["catalogue"][number];

function ChallengesPage() {
  const navigate = useNavigate();
  const [catalogue, setCatalogue] = useState<CatalogueEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [topicId, setTopicId] = useState<MissionTopicId>("linux-foundations");
  const [mode, setMode] = useState<MissionMode>("levels");
  const [starting, setStarting] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

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

  useEffect(() => { void load(); }, [load]);

  const selectedTopic = MISSION_TOPICS.find((topic) => topic.id === topicId)!;
  const published = useMemo(
    () => (catalogue ?? []).filter((entry) => entry.requiredSkills.some((skill) => selectedTopic.skills.includes(skill))),
    [catalogue, selectedTopic.skills],
  );
  const levels = useMemo(
    () => buildMissionLevels(topicId, published.map((entry) => ({ id: entry.id, order: entry.order, title: entry.title, objective: entry.objective }))),
    [topicId, published],
  );

  const start = async (challengeId: string) => {
    setStarting(challengeId);
    setError(null);
    try {
      const res = await startMission({ data: { challengeId } });
      await navigate({ to: "/mission", search: { c: res.challengeId } });
    } catch (e) {
      setError(e instanceof Error ? e.message : "That mission could not be opened right now.");
    } finally {
      setStarting(null);
    }
  };

  const openInfinity = async () => {
    if (generating) return;
    setGenerating(true);
    setError(null);
    try {
      const exercise = await generateAdaptiveExerciseFn({ data: { kind: "mission", topic: selectedTopic.name } });
      if (!exercise.launchableId) throw new Error("Infinity generated a non-executable exercise. Please try again.");
      await navigate({ to: "/mission", search: { c: exercise.launchableId } });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Infinity could not generate a fresh exercise right now.");
    } finally {
      setGenerating(false);
    }
  };

  const completedCount = published.filter((entry) => entry.attempt?.status === "COMPLETE").length;
  const currentLevel = Math.min(50, completedCount + 1);

  return (
    <AppShell>
      <PageHeader
        eyebrow="Mission Forge"
        title="Choose how you want to train"
        description="Pick a topic first. Then choose a structured 1–50 progression or unlimited Infinity practice. The terminal, verifier and real Kali workflow remain unchanged."
        actions={<Tag tone="signal"><Sparkles className="size-3" /> Real lab + verified outcomes</Tag>}
      />

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <Panel className="h-fit">
          <PanelHeader title="Topics" subtitle="Practice independently by topic" icon={<Map className="size-4" />} />
          <div className="space-y-2">
            {MISSION_TOPICS.map((topic) => (
              <button
                key={topic.id}
                onClick={() => { setTopicId(topic.id); setMode("levels"); }}
                className={`w-full rounded-xl border p-3 text-left transition-colors ${topic.id === topicId ? "border-primary/40 bg-primary/10" : "border-border bg-surface/40 hover:border-border-strong"}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold">{topic.name}</span>
                  {topic.id === topicId ? <ChevronRight className="size-4 text-primary" /> : null}
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{topic.description}</p>
              </button>
            ))}
          </div>
        </Panel>

        <div className="space-y-6">
          <Panel className="border-primary/20 bg-primary/5">
            <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-widest text-primary">Selected topic</p>
                <h2 className="mt-2 font-display text-2xl font-semibold">{selectedTopic.name}</h2>
                <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{selectedTopic.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button variant={mode === "levels" ? "forge" : "outline"} onClick={() => setMode("levels")}>
                  <Map className="size-4" /> Levels
                </Button>
                <Button variant={mode === "infinity" ? "forge" : "outline"} onClick={() => setMode("infinity")}>
                  <InfinityIcon className="size-4" /> Infinity
                </Button>
              </div>
            </div>
          </Panel>

          {error ? <ErrorState description={error} onRetry={() => void load()} /> : null}

          {!catalogue ? <LoadingBlock /> : mode === "infinity" ? (
            <Panel>
              <PanelHeader title="∞ Infinity" subtitle="Unlimited practice" icon={<InfinityIcon className="size-5" />} />
              <div className="rounded-2xl border border-primary/20 bg-surface-2/40 p-6">
                <h3 className="text-lg font-semibold">Never run out of questions</h3>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  Infinity is a separate training mode. It does not replace curriculum progression and it does not require Level 1–50 completion. Fresh exercises are generated from your learner evidence and validated before they become launchable.
                </p>
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  {[
                    ["Adaptive", "Uses demonstrated skills, mistakes and mastery."],
                    ["Fresh", "Novelty checks prevent simple question recycling."],
                    ["Verified", "Terminal evidence and the deterministic verifier still decide completion."],
                  ].map(([title, body]) => (
                    <div key={title} className="rounded-xl border border-border bg-surface/60 p-3">
                      <p className="text-xs font-semibold">{title}</p>
                      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{body}</p>
                    </div>
                  ))}
                </div>
                <Button className="mt-6" disabled={generating} onClick={() => void openInfinity()}>
                  <InfinityIcon className="size-4" /> {generating ? "Generating…" : `Start ${selectedTopic.name} Infinity`}
                </Button>
              </div>
            </Panel>
          ) : (
            <Panel>
              <PanelHeader
                title="Levels 1–50"
                subtitle={`Level ${currentLevel} is the next curriculum position for this topic`}
                icon={<Map className="size-4" />}
              />
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                {levels.map((level) => {
                  const entry = level.challengeId ? published.find((item) => item.id === level.challengeId) : undefined;
                  const unlocked = Boolean(entry?.unlocked);
                  const complete = entry?.attempt?.status === "COMPLETE";
                  const publishedLevel = Boolean(level.challengeId);
                  return (
                    <div key={`${topicId}-${level.level}`} className={`relative rounded-xl border p-3 ${complete ? "border-signal/40 bg-signal/5" : unlocked ? "border-primary/35 bg-primary/5" : "border-border bg-surface/40"}`}>
                      <div className="flex items-center justify-between">
                        <span className="flex size-8 items-center justify-center rounded-lg border border-border bg-surface text-xs font-bold">{complete ? <Check className="size-4 text-signal" /> : level.level}</span>
                        {!publishedLevel ? <Lock className="size-3.5 text-muted-foreground" /> : complete ? <Trophy className="size-3.5 text-signal" /> : <Swords className="size-3.5 text-primary" />}
                      </div>
                      <p className="mt-3 min-h-9 text-xs font-semibold">{level.title}</p>
                      <p className="mt-1 line-clamp-3 min-h-12 text-[10px] leading-relaxed text-muted-foreground">{level.objective}</p>
                      {publishedLevel ? (
                        <Button size="sm" variant={complete ? "ghost" : "outline"} disabled={!unlocked || starting !== null} className="mt-3 w-full" onClick={() => void start(level.challengeId!)}>
                          {starting === level.challengeId ? "Opening…" : complete ? "Revisit" : entry?.attempt ? "Resume" : "Start"}
                        </Button>
                      ) : (
                        <div className="mt-3 flex items-center gap-1.5 text-[10px] text-muted-foreground"><Lock className="size-3" /> Not published yet</div>
                      )}
                    </div>
                  );
                })}
              </div>
              {published.length === 0 ? (
                <div className="mt-5"><EmptyState title="This topic has no published executable levels yet" description="Infinity remains available while the topic curriculum and its deterministic verifiers are built. LinuxForge will not pretend an unverified level is ready." /></div>
              ) : null}
            </Panel>
          )}

          <Panel>
            <PanelHeader title="How progression works" icon={<Trophy className="size-4" />} />
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-border bg-surface/40 p-4"><p className="text-xs font-semibold">Level</p><p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">Curriculum position. It controls what is unlocked; it is not the sole definition of difficulty.</p></div>
              <div className="rounded-xl border border-border bg-surface/40 p-4"><p className="text-xs font-semibold">Mastery</p><p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">Your demonstrated understanding, retention, independence and mistakes influence adaptation.</p></div>
              <div className="rounded-xl border border-border bg-surface/40 p-4"><p className="text-xs font-semibold">Difficulty</p><p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">The complexity of a particular exercise. AI can adapt it without silently rewriting curriculum gates.</p></div>
            </div>
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}
