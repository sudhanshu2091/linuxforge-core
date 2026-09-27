import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Award,
  Edit3,
  Flame,
  GraduationCap,
  Languages,
  Share2,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Trophy,
} from "lucide-react";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/app/AppShell";
import {
  Button,
  PageHeader,
  Panel,
  PanelHeader,
  ProgressBar,
  StatCard,
  Tag,
  buttonClass,
} from "@/components/kit/primitives";
import { ErrorState, LoadingBlock } from "@/components/kit/states";
import { handleFrom, initialsFrom, useAuth } from "@/lib/auth";
import { useLearnerOverview } from "@/lib/learner/use-learner-overview";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Profile — LinuxForge AI" },
      {
        name: "description",
        content: "Your live LinuxForge identity, progression and skill evidence.",
      },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const auth = useAuth();
  const { data, loading, error, reload } = useLearnerOverview();
  const [shared, setShared] = useState(false);

  const joinedAt = useMemo(
    () =>
      auth.profile
        ? new Date(auth.profile.created_at).toLocaleDateString(undefined, {
            month: "short",
            year: "numeric",
          })
        : "—",
    [auth.profile],
  );

  if (auth.status === "loading" || (loading && !data))
    return (
      <AppShell>
        <PageHeader
          eyebrow="Profile"
          title="Loading your forge identity"
          description="Pulling your account and learning evidence."
        />
        <LoadingBlock rows={7} />
      </AppShell>
    );
  if (auth.status === "error" || (error && !data))
    return (
      <AppShell>
        <PageHeader
          eyebrow="Profile"
          title="Profile is temporarily unavailable"
          description="Your account has not been changed."
        />
        <ErrorState
          description={auth.error ?? error ?? "Unable to load profile."}
          onRetry={() => {
            auth.reload();
            void reload();
          }}
        />
      </AppShell>
    );
  if (!auth.profile || !data)
    return (
      <AppShell>
        <PageHeader
          eyebrow="Profile"
          title="No learner profile found"
          description="Sign in again to initialize your learner profile."
        />
      </AppShell>
    );

  const overview = data;
  const best = overview.skills.reduce<(typeof overview.skills)[number] | null>(
    (current, skill) => (!current || skill.mastery > current.mastery ? skill : current),
    null,
  );
  const worst = overview.skills.reduce<(typeof overview.skills)[number] | null>(
    (current, skill) => (!current || skill.mastery < current.mastery ? skill : current),
    null,
  );
  const displayName = overview.profile?.displayName ?? auth.profile.display_name;
  const xpProgress = overview.progression.levelProgress;

  return (
    <AppShell>
      <PageHeader
        eyebrow="Profile"
        title="Your forge identity"
        description="Your identity and progression are live. Skill evidence comes from recorded learning activity."
        actions={
          <>
            <Link to="/dashboard" className={buttonClass({ variant: "ghost", size: "sm" })}>
              <ArrowLeft className="size-3.5" /> Dashboard
            </Link>
            <Button variant="outline" size="sm" onClick={() => setShared((v) => !v)}>
              <Share2 className="size-3.5" /> {shared ? "Profile link ready" : "Share"}
            </Button>
            <Link to="/settings" className={buttonClass({ size: "sm" })}>
              <Edit3 className="size-3.5" /> Edit profile
            </Link>
          </>
        }
      />

      <Panel className="relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-24 forge-grid opacity-40" />
        <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <span className="flex size-20 shrink-0 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 font-display text-2xl font-semibold text-primary">
              {initialsFrom(displayName)}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-2xl font-semibold">{displayName}</h2>
                <Tag tone="signal">{overview.progression.rank}</Tag>
              </div>
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                @{handleFrom(auth.profile, auth.user?.email)}
              </p>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                {overview.profile?.comfortLevel}. Learning with{" "}
                {overview.preferences?.tutorLanguage ?? "Mix both"} mentor responses.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Tag>
                  <GraduationCap className="size-3" /> Level {overview.progression.level}
                </Tag>
                <Tag>
                  <Languages className="size-3" />{" "}
                  {overview.preferences?.tutorLanguage ?? "Mix both"}
                </Tag>
                <Tag>Joined {joinedAt}</Tag>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-surface-2/60 p-4">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Level progress</span>
              <span className="font-mono">{xpProgress}%</span>
            </div>
            <ProgressBar value={xpProgress} className="mt-2" />
            <p className="mt-2 font-mono text-[11px] text-muted-foreground">
              {overview.progression.totalXp.toLocaleString()} XP ·{" "}
              {overview.progression.xpToNextLevel} to next level
            </p>
          </div>
        </div>
      </Panel>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Current streak"
          value={`${overview.currentStreak} days`}
          hint={`Best ${overview.longestStreak}`}
          icon={<Flame className="size-4" />}
          tone="warn"
        />
        <StatCard
          label="Challenges cleared"
          value={String(overview.progression.challengesCompleted)}
          hint={`${overview.accuracy}% verified accuracy`}
          icon={<Trophy className="size-4" />}
        />
        <StatCard
          label="Labs completed"
          value={String(overview.progression.labsCompleted)}
          hint="Verified lab progression"
          icon={<Target className="size-4" />}
          tone="accent"
        />
        <StatCard
          label="Hands-on time"
          value={`${overview.timeOnTaskMinutes}m`}
          hint={`${overview.commandCount} commands`}
          icon={<TrendingUp className="size-4" />}
          tone="signal"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <Panel>
            <PanelHeader title="Skill mastery" subtitle="Current learner-model evidence" />
            {overview.skills.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No mastery evidence yet. Complete a mission to start building your skill profile.
              </p>
            ) : (
              <>
                <ul className="space-y-3.5">
                  {overview.skills.map((skill) => (
                    <li key={skill.id}>
                      <div className="mb-1.5 flex items-center justify-between text-xs">
                        <span>{skill.label}</span>
                        <span className="font-mono text-muted-foreground">{skill.mastery}%</span>
                      </div>
                      <ProgressBar value={skill.mastery} tone="primary" />
                    </li>
                  ))}
                </ul>
                {best && worst ? (
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border border-signal/30 bg-signal/8 p-3">
                      <p className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-signal">
                        <TrendingUp className="size-3.5" /> Strongest
                      </p>
                      <p className="mt-1 text-sm font-medium">{best.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {best.mastery}% mastery · {best.confidence}% confidence
                      </p>
                    </div>
                    <div className="rounded-lg border border-warn/30 bg-warn/8 p-3">
                      <p className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-warn">
                        <TrendingDown className="size-3.5" /> Needs practice
                      </p>
                      <p className="mt-1 text-sm font-medium">{worst.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {worst.mastery}% mastery · {worst.confidence}% confidence
                      </p>
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </Panel>
          <Panel>
            <PanelHeader title="Recent challenge record" icon={<Target className="size-4" />} />
            {overview.challenges.length === 0 ? (
              <p className="text-sm text-muted-foreground">No challenge attempts yet.</p>
            ) : (
              <ul className="space-y-2">
                {overview.challenges.slice(0, 8).map((challenge) => (
                  <li
                    key={challenge.id}
                    className="flex items-center gap-3 rounded-lg border border-border bg-surface-2/50 px-3 py-2.5"
                  >
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {challenge.id}
                    </span>
                    <span className="flex-1 text-xs">
                      {challenge.status === "COMPLETE" ? "Verified complete" : "Attempted"}
                    </span>
                    <span className="font-mono text-[11px]">{challenge.score}/100</span>
                    <Tag tone={challenge.status === "COMPLETE" ? "signal" : "accent"}>
                      {challenge.attempts}×
                    </Tag>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
        <div className="space-y-6">
          <Panel>
            <PanelHeader title="Current focus" icon={<Sparkles className="size-4" />} />
            {worst ? (
              <>
                <p className="text-sm leading-relaxed">
                  Your weakest recorded branch is <strong>{worst.label}</strong> at {worst.mastery}
                  %. That becomes a natural target for the next adaptive drill.
                </p>
                <Link
                  to="/challenges"
                  className={cn(buttonClass({ variant: "outline", size: "sm" }), "mt-4 w-full")}
                >
                  Practise {worst.label}
                </Link>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Start your first mission and the mentor will begin building this profile.
              </p>
            )}
          </Panel>
          <Panel>
            <PanelHeader title="Account" icon={<Languages className="size-4" />} />
            <dl className="space-y-3 text-xs">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Email</dt>
                <dd className="truncate">{overview.profile?.email || auth.user?.email || "—"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Linux level</dt>
                <dd>{overview.profile?.comfortLevel ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Tutor</dt>
                <dd>{overview.preferences?.tutorLanguage ?? "—"}</dd>
              </div>
            </dl>
          </Panel>
          <Panel>
            <PanelHeader title="Achievements" icon={<Award className="size-4" />} />
            <p className="text-sm text-muted-foreground">
              Achievement persistence is the next social/game-system layer. Your verified challenge
              record is already live.
            </p>
            <Link
              to="/achievements"
              className={buttonClass({ variant: "ghost", size: "sm" }) + " mt-3 w-full"}
            >
              Open achievements
            </Link>
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}
