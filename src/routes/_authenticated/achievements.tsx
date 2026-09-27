import { createFileRoute } from "@tanstack/react-router";
import { Award, Flame, Lock, Medal, ShieldCheck, Sparkles, Terminal, Trophy } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { PageHeader, Panel, PanelHeader, ProgressBar, Tag } from "@/components/kit/primitives";
import { ErrorState, LoadingBlock } from "@/components/kit/states";
import { useLearnerOverview } from "@/lib/learner/use-learner-overview";
import { rankForLevel } from "@/lib/learner/learner-model";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/achievements")({
  head: () => ({
    meta: [
      { title: "Achievements — LinuxForge AI" },
      { name: "description", content: "Verified LinuxForge badges and milestones." },
    ],
  }),
  component: AchievementsPage,
});

const definitions = [
  {
    name: "First Command",
    icon: Terminal,
    note: "Run your first recorded terminal command.",
    unlocked: (o: ReturnType<typeof useLearnerOverview>["data"]) =>
      Boolean(o && o.commandCount > 0),
  },
  {
    name: "Permission Smith",
    icon: ShieldCheck,
    note: "Reach 90% permissions mastery.",
    unlocked: (o: ReturnType<typeof useLearnerOverview>["data"]) =>
      Boolean((o?.skills.find((s) => s.id === "permissions")?.mastery ?? 0) >= 90),
  },
  {
    name: "Seven-Day Forge",
    icon: Flame,
    note: "Build a seven-day practice streak.",
    unlocked: (o: ReturnType<typeof useLearnerOverview>["data"]) =>
      Boolean(o && o.longestStreak >= 7),
  },
  {
    name: "Log Reader",
    icon: Award,
    note: "Complete the foundational log-file mission.",
    unlocked: (o: ReturnType<typeof useLearnerOverview>["data"]) =>
      Boolean(o?.challenges.some((c) => c.id === "C03" && c.status === "COMPLETE")),
  },
  {
    name: "Hardener",
    icon: Medal,
    note: "Reach 80% hardening mastery.",
    unlocked: (o: ReturnType<typeof useLearnerOverview>["data"]) =>
      Boolean((o?.skills.find((s) => s.id === "hardening")?.mastery ?? 0) >= 80),
  },
  {
    name: "Mentor's Pick",
    icon: Sparkles,
    note: "Explain a concept back after a verified session.",
    unlocked: () => false,
  },
  {
    name: "Process Whisperer",
    icon: Trophy,
    note: "Reach 80% process mastery.",
    unlocked: (o: ReturnType<typeof useLearnerOverview>["data"]) =>
      Boolean((o?.skills.find((s) => s.id === "processes")?.mastery ?? 0) >= 80),
  },
  {
    name: "Architect",
    icon: Trophy,
    note: "Reach the Architect rank.",
    unlocked: (o: ReturnType<typeof useLearnerOverview>["data"]) =>
      Boolean(o && rankForLevel(o.progression.level) === "Architect"),
  },
] as const;

function AchievementsPage() {
  const { data, loading, error, reload } = useLearnerOverview();
  if (loading && !data)
    return (
      <AppShell>
        <PageHeader
          eyebrow="Achievements"
          title="Loading your proof"
          description="Checking verified learner evidence."
        />
        <LoadingBlock rows={6} />
      </AppShell>
    );
  if (error && !data)
    return (
      <AppShell>
        <PageHeader
          eyebrow="Achievements"
          title="Achievements are temporarily unavailable"
          description="Your learning data is safe."
        />
        <ErrorState description={error} onRetry={() => void reload()} />
      </AppShell>
    );
  const overview = data!;
  const unlocked = definitions.filter((badge) => badge.unlocked(overview)).length;

  return (
    <AppShell>
      <PageHeader
        eyebrow="Achievements"
        title="Proof you can point at"
        description="Badges unlock from verified learner evidence — not clicks or sample data."
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Panel>
          <PanelHeader
            title="Badge collection"
            subtitle={`${unlocked} of ${definitions.length} unlocked`}
            icon={<Award className="size-4" />}
          />
          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {definitions.map((b) => {
              const isUnlocked = b.unlocked(overview);
              return (
                <div
                  key={b.name}
                  className={cn(
                    "group relative rounded-xl border bg-surface-2/40 p-4 text-center transition-colors",
                    isUnlocked ? "border-signal/35" : "border-border",
                  )}
                >
                  <span
                    className={cn(
                      "mx-auto flex size-12 items-center justify-center rounded-xl border",
                      isUnlocked
                        ? "border-signal/35 bg-signal/10 text-signal"
                        : "border-border bg-surface text-muted-foreground",
                    )}
                  >
                    <b.icon className="size-5" />
                  </span>
                  <p className="mt-3 text-xs font-semibold">{b.name}</p>
                  <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{b.note}</p>
                  <span className="mt-3 inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    {isUnlocked ? (
                      <>
                        <span className="text-signal">Unlocked</span>
                      </>
                    ) : (
                      <>
                        <Lock className="size-3" /> Locked
                      </>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </Panel>
        <div className="space-y-6">
          <Panel>
            <PanelHeader title="Current rank" icon={<Trophy className="size-4" />} />
            <div className="rounded-xl border border-primary/25 bg-primary/8 p-4 text-center">
              <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                <Trophy className="size-6" />
              </span>
              <p className="mt-3 font-display text-lg font-semibold">{overview.progression.rank}</p>
              <p className="text-xs text-muted-foreground">Level {overview.progression.level}</p>
              <ProgressBar className="mt-4" value={overview.progression.levelProgress} />
            </div>
          </Panel>
          <Panel>
            <PanelHeader title="Milestones" subtitle="Derived from verified evidence" />{" "}
            <ul className="space-y-2">
              {[
                ["Clear 25 challenges", overview.progression.challengesCompleted >= 25],
                ["30-day streak", overview.longestStreak >= 30],
                [
                  "80% hardening mastery",
                  Boolean((overview.skills.find((s) => s.id === "hardening")?.mastery ?? 0) >= 80),
                ],
                ["Reach Architect", overview.progression.rank === "Architect"],
              ].map(([label, done]) => (
                <li
                  key={String(label)}
                  className="flex items-center justify-between rounded-lg border border-border bg-surface-2/50 px-3 py-2.5 text-sm"
                >
                  {label}
                  <Tag tone={done ? "signal" : "primary"}>{done ? "Complete" : "Pending"}</Tag>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}
