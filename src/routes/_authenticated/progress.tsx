import { createFileRoute } from "@tanstack/react-router";
import {
  Activity,
  CalendarDays,
  Flame,
  Gauge,
  LineChart,
  RefreshCw,
  Target,
  TrendingUp,
} from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import {
  Button,
  PageHeader,
  Panel,
  PanelHeader,
  ProgressBar,
  StatCard,
  Tag,
} from "@/components/kit/primitives";
import { ErrorState, LoadingBlock } from "@/components/kit/states";
import { useLearnerOverview } from "@/lib/learner/use-learner-overview";

export const Route = createFileRoute("/_authenticated/progress")({
  head: () => ({
    meta: [
      { title: "Progress — LinuxForge AI" },
      {
        name: "description",
        content: "Live skill mastery, streaks, accuracy and hands-on learning progress.",
      },
    ],
  }),
  component: ProgressPage,
});

function ProgressPage() {
  const { data, loading, error, reload } = useLearnerOverview();

  if (loading && !data)
    return (
      <AppShell>
        <PageHeader
          eyebrow="Progress"
          title="Loading your evidence"
          description="Calculating your recorded learning state."
        />
        <LoadingBlock rows={6} />
      </AppShell>
    );
  if (error && !data)
    return (
      <AppShell>
        <PageHeader
          eyebrow="Progress"
          title="Progress is temporarily unavailable"
          description="Your saved learning data has not been changed."
        />
        <ErrorState description={error} onRetry={() => void reload()} />
      </AppShell>
    );

  const overview = data!;
  const counts = new Map<string, number>();
  for (const timestamp of overview.activityDates) {
    const date = new Date(timestamp);
    if (!Number.isNaN(date.getTime())) {
      const key = date.toISOString().slice(0, 10);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  const days = Array.from({ length: 104 }, (_, index) => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - (103 - index));
    const key = d.toISOString().slice(0, 10);
    return { key, count: counts.get(key) ?? 0 };
  });
  const maxActivity = Math.max(1, ...days.map((d) => d.count));

  return (
    <AppShell>
      <PageHeader
        eyebrow="Progress"
        title="Where your skills actually stand"
        description="This page is driven by verified challenge outcomes and recorded terminal work."
        actions={
          <Button variant="ghost" size="sm" onClick={() => void reload()} disabled={loading}>
            <RefreshCw className={loading ? "size-3.5 animate-spin" : "size-3.5"} /> Refresh
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Rank"
          value={overview.progression.rank}
          hint={`Level ${overview.progression.level}`}
          icon={<TrendingUp className="size-4" />}
        />
        <StatCard
          label="Verified accuracy"
          value={`${overview.accuracy}%`}
          hint={`${overview.firstTryAccuracy}% on first try`}
          icon={<Target className="size-4" />}
          tone="signal"
        />
        <StatCard
          label="Best streak"
          value={`${overview.longestStreak} days`}
          hint={`${overview.currentStreak} currently`}
          icon={<Flame className="size-4" />}
          tone="warn"
        />
        <StatCard
          label="Hands-on time"
          value={`${overview.timeOnTaskMinutes}m`}
          hint={`${overview.commandCount} recorded commands`}
          icon={<Gauge className="size-4" />}
          tone="accent"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <Panel>
            <PanelHeader
              title="Skill mastery"
              subtitle="Evidence collected by the learning engine"
              icon={<LineChart className="size-4" />}
            />
            {overview.skills.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No skill evidence yet. Complete your first mission to start the learner model.
              </p>
            ) : (
              <div className="space-y-4">
                {overview.skills.map((skill) => (
                  <div key={skill.id}>
                    <div className="mb-1.5 flex items-center justify-between text-xs">
                      <span>{skill.label}</span>
                      <span className="font-mono text-muted-foreground">
                        {skill.mastery}% · {skill.confidence}% confidence
                      </span>
                    </div>
                    <ProgressBar value={skill.mastery} tone="primary" />
                    <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
                      <span>
                        {skill.attempts} attempts · {skill.successfulAttempts} successful
                      </span>
                      <span>{skill.hintDependency}% hint dependency</span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
                      <span>Retention {skill.retention}%</span>
                      <span>Independence {skill.independence}%</span>
                      <span>Speed {skill.speedScore}%</span>
                      <span>Consistency {skill.consistency}%</span>
                      <span>Difficulty {skill.difficultyRating.toFixed(1)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel>
            <PanelHeader
              title="Practice calendar"
              subtitle="Activity intensity over the last 104 days"
              icon={<CalendarDays className="size-4" />}
            />
            <div className="grid grid-cols-[repeat(26,minmax(0,1fr))] gap-1">
              {days.map((day) => (
                <span
                  key={day.key}
                  title={`${day.key}: ${day.count} events`}
                  className="aspect-square rounded-[3px] border border-border bg-primary"
                  style={{ opacity: day.count ? 0.15 + 0.85 * (day.count / maxActivity) : 0.06 }}
                />
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Less</span>
              <span>
                {overview.activityDates.length} total activity events in the loaded window
              </span>
              <span>More</span>
            </div>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel>
            <PanelHeader
              title="Level ladder"
              subtitle="XP is gamification; mastery is competence"
            />
            {[
              ["Recruit", 1],
              ["Operator", 5],
              ["Engineer", 10],
              ["Architect", 15],
            ].map(([name, level]) => (
              <div
                key={name}
                className="flex items-center justify-between rounded-lg border border-border bg-surface-2/50 px-3 py-2.5 text-sm"
              >
                <span className="flex items-center gap-2.5">
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {String(level).padStart(2, "0")}
                  </span>
                  {name}
                </span>
                <Tag tone={overview.progression.level >= Number(level) ? "signal" : "primary"}>
                  {overview.progression.level >= Number(level) ? "Unlocked" : "Locked"}
                </Tag>
              </div>
            ))}
          </Panel>

          <Panel>
            <PanelHeader title="Next review signals" icon={<Activity className="size-4" />} />
            {overview.skills.filter((s) => s.nextReview).length === 0 ? (
              <p className="text-sm text-muted-foreground">No review schedule yet.</p>
            ) : (
              <ul className="space-y-2">
                {overview.skills
                  .filter((s) => s.nextReview)
                  .sort((a, b) => String(a.nextReview).localeCompare(String(b.nextReview)))
                  .slice(0, 6)
                  .map((skill) => (
                    <li
                      key={skill.id}
                      className="flex items-center justify-between rounded-lg border border-border bg-surface-2/50 px-3 py-2.5"
                    >
                      <span className="text-xs">{skill.label}</span>
                      <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                        {new Date(skill.nextReview!).toLocaleDateString()}
                      </span>
                    </li>
                  ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}
