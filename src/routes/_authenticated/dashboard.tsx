import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity,
  ArrowRight,
  Bot,
  Flame,
  GraduationCap,
  RefreshCw,
  Swords,
  Target,
  Trophy,
  Zap,
} from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import {
  Button,
  Panel,
  PanelHeader,
  PageHeader,
  ProgressBar,
  StatCard,
  Tag,
  buttonClass,
} from "@/components/kit/primitives";
import { ErrorState, LoadingBlock } from "@/components/kit/states";
import { useLearnerOverview } from "@/lib/learner/use-learner-overview";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Command Deck — LinuxForge AI" },
      {
        name: "description",
        content: "Your LinuxForge AI command deck: live progression, skills, streak and lab state.",
      },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { data, loading, error, reload } = useLearnerOverview();

  if (loading && !data) {
    return (
      <AppShell>
        <PageHeader
          eyebrow="Command deck"
          title="Loading your forge"
          description="Pulling your live learner state."
        />
        <LoadingBlock rows={6} />
      </AppShell>
    );
  }

  if (error && !data) {
    return (
      <AppShell>
        <PageHeader
          eyebrow="Command deck"
          title="Your forge is temporarily unavailable"
          description="The account is still safe. We could not load the live learner state."
        />
        <ErrorState description={error} onRetry={() => void reload()} />
      </AppShell>
    );
  }

  const overview = data!;
  const weakest = overview.skills.reduce<(typeof overview.skills)[number] | null>(
    (current, skill) => (!current || skill.mastery < current.mastery ? skill : current),
    null,
  );
  const recent = overview.challenges.filter((c) => c.attempts > 0).slice(0, 3);

  return (
    <AppShell>
      <PageHeader
        eyebrow="Command deck"
        title={`Good to see you back, ${overview.profile?.displayName?.split(" ")[0] ?? "operator"}`}
        description="Everything below is derived from your recorded learning and lab activity — no demo numbers."
        actions={
          <>
            <Button variant="ghost" size="sm" onClick={() => void reload()} disabled={loading}>
              <RefreshCw className={loading ? "size-3.5 animate-spin" : "size-3.5"} /> Refresh
            </Button>
            <Link to="/challenges" className={buttonClass({ size: "sm" })}>
              Today's drill <ArrowRight className="size-3.5" />
            </Link>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Forge rank"
          value={overview.progression.rank}
          hint={`Level ${overview.progression.level}`}
          icon={<Trophy className="size-4" />}
        />
        <StatCard
          label="Streak"
          value={`${overview.currentStreak} days`}
          hint={`Best: ${overview.longestStreak} days`}
          icon={<Flame className="size-4" />}
          tone="warn"
        />
        <StatCard
          label="XP"
          value={overview.progression.totalXp.toLocaleString()}
          hint={`${overview.progression.xpToNextLevel} XP to next level`}
          icon={<Zap className="size-4" />}
          tone="accent"
        />
        <StatCard
          label="Labs cleared"
          value={String(overview.progression.labsCompleted)}
          hint={`${overview.progression.challengesCompleted} challenges`}
          icon={<Target className="size-4" />}
          tone="signal"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Panel>
            <PanelHeader
              title="Level momentum"
              subtitle={`${overview.progression.totalXp.toLocaleString()} XP total`}
              icon={<GraduationCap className="size-4" />}
              action={<Tag tone="primary">Level {overview.progression.level}</Tag>}
            />
            <ProgressBar value={overview.progression.levelProgress} />
            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
              <span>{overview.progression.levelProgress}% through this level</span>
              <span>{overview.progression.xpToNextLevel} XP remaining</span>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-border bg-surface-2/50 p-3">
                <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  Verified accuracy
                </p>
                <p className="mt-1 text-lg font-semibold">{overview.accuracy}%</p>
              </div>
              <div className="rounded-lg border border-border bg-surface-2/50 p-3">
                <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  First try
                </p>
                <p className="mt-1 text-lg font-semibold">{overview.firstTryAccuracy}%</p>
              </div>
              <div className="rounded-lg border border-border bg-surface-2/50 p-3">
                <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  Hands-on time
                </p>
                <p className="mt-1 text-lg font-semibold">{overview.timeOnTaskMinutes}m</p>
              </div>
            </div>
          </Panel>

          <Panel>
            <PanelHeader
              title="Recent work"
              subtitle="Your latest recorded challenge attempts"
              icon={<Swords className="size-4" />}
            />
            {recent.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No challenge attempts yet. Start C01 and build your first streak.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {recent.map((item) => (
                  <li key={item.id} className="flex items-center gap-3 py-3">
                    <span className="font-mono text-[11px] text-muted-foreground">{item.id}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {item.status === "COMPLETE" ? "Verified complete" : "In progress"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Score {item.score}/100 · {item.attempts} attempt
                        {item.attempts === 1 ? "" : "s"}
                      </p>
                    </div>
                    <Tag tone={item.status === "COMPLETE" ? "signal" : "accent"}>
                      {item.status === "COMPLETE" ? "Cleared" : "Active"}
                    </Tag>
                  </li>
                ))}
              </ul>
            )}
            <Link
              to="/challenges"
              className={buttonClass({ variant: "outline", size: "sm" }) + " mt-4"}
            >
              Open challenge board
            </Link>
          </Panel>

          <Panel>
            <PanelHeader
              title="Lab status"
              subtitle="Your isolated training environment"
              icon={<Activity className="size-4" />}
            />
            {overview.activeLab ? (
              <div className="flex flex-wrap items-center gap-3">
                <Tag tone="signal">{overview.activeLab.status}</Tag>
                <span className="font-mono text-xs text-muted-foreground">
                  {overview.activeLab.provider}
                </span>
                <span className="text-xs text-muted-foreground">
                  Last active {new Date(overview.activeLab.lastActiveAt).toLocaleString()}
                </span>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Your lab will appear here when you first open the terminal or a mission.
              </p>
            )}
            <Link to="/terminal" className={buttonClass({ size: "sm" }) + " mt-4"}>
              Open practice terminal
            </Link>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel>
            <PanelHeader
              title="Mentor nudge"
              subtitle="Based on your current skill memory"
              icon={<Bot className="size-4" />}
            />
            {weakest ? (
              <>
                <p className="rounded-lg border border-primary/25 bg-primary/8 p-3 text-sm leading-relaxed text-muted-foreground">
                  {weakest.label} is currently your weakest recorded branch at {weakest.mastery}%.
                  Let's turn that into a small win today.
                </p>
                <Link
                  to="/challenges"
                  className={buttonClass({ variant: "outline", size: "sm" }) + " mt-4 w-full"}
                >
                  Practise {weakest.label}
                </Link>
              </>
            ) : (
              <p className="text-sm leading-relaxed text-muted-foreground">
                Start a mission and I’ll use the result to personalize your next drill.
              </p>
            )}
          </Panel>

          <Panel>
            <PanelHeader title="Skill branches" subtitle="Verified mastery, not reading time" />
            <ul className="space-y-3">
              {overview.skills.length === 0 ? (
                <li className="text-sm text-muted-foreground">No skill evidence yet.</li>
              ) : (
                overview.skills.map((skill) => (
                  <li key={skill.id}>
                    <div className="mb-1.5 flex items-center justify-between text-xs">
                      <span>{skill.label}</span>
                      <span className="font-mono text-muted-foreground">{skill.mastery}%</span>
                    </div>
                    <ProgressBar value={skill.mastery} tone="accent" />
                  </li>
                ))
              )}
            </ul>
          </Panel>

          <Panel>
            <PanelHeader title="Practice footprint" subtitle="Recorded terminal activity" />
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-border bg-surface-2/50 p-3">
                <p className="text-xs text-muted-foreground">Commands</p>
                <p className="mt-1 text-xl font-semibold">{overview.commandCount}</p>
              </div>
              <div className="rounded-lg border border-border bg-surface-2/50 p-3">
                <p className="text-xs text-muted-foreground">Time</p>
                <p className="mt-1 text-xl font-semibold">{overview.timeOnTaskMinutes}m</p>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}
