import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Award,
  Calendar,
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
  Users,
} from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/app/AppShell";
import {
  Button,
  FutureTag,
  PageHeader,
  Panel,
  PanelHeader,
  ProgressBar,
  StatCard,
  Tag,
  buttonClass,
} from "@/components/kit/primitives";
import { EmptyState, ErrorState, LoadingBlock } from "@/components/kit/states";
import { handleFrom, initialsFrom, useAuth } from "@/lib/auth";
import {
  getLearnerService,
  strongestSkill,
  useAsync,
  weakestSkill,
  RANK_LADDER,
} from "@/lib/learner-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Profile — LinuxForge AI" },
      {
        name: "description",
        content:
          "Your LinuxForge AI forge identity: rank, level, XP, streaks, skill mastery, personal bests and badges.",
      },
      { property: "og:title", content: "Profile — LinuxForge AI" },
      { property: "og:description", content: "Rank, XP, streaks, skill mastery, personal bests and badges." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const auth = useAuth();
  const learner = useAsync(getLearnerService);
  const [shared, setShared] = useState(false);

  return (
    <AppShell>
      <PageHeader
        eyebrow="Profile"
        title="Your forge identity"
        description="Your account details are live. Progression stays at zero until the learning systems record real results."
        actions={
          <>
            <Link to="/dashboard" className={buttonClass({ variant: "ghost", size: "sm" })}>
              <ArrowLeft className="size-3.5" /> Dashboard
            </Link>
            <Button variant="outline" size="sm" onClick={() => setShared((v) => !v)}>
              <Share2 className="size-3.5" /> {shared ? "Link copied (demo)" : "Share"}
            </Button>
            <Link to="/settings" className={buttonClass({ size: "sm" })}>
              <Edit3 className="size-3.5" /> Edit profile
            </Link>
          </>
        }
      />

      {auth.status === "loading" ? <LoadingBlock rows={4} /> : null}
      {auth.status === "signed-out" ? (
        <EmptyState title="You're signed out" description="Sign in again to see your profile." />
      ) : null}
      {auth.status === "error" ? (
        <ErrorState
          description={auth.error ?? "We couldn't reach your account right now."}
          onRetry={auth.reload}
        />
      ) : null}

      {auth.status === "ready" && auth.profile ? (
        (() => {
          const demo = learner.status === "success" && learner.data ? learner.data : null;
          const profile = auth.profile!;
          const me = {
            displayName: profile.display_name,
            email: profile.email || auth.user?.email || "",
            handle: handleFrom(profile, auth.user?.email),
            initials: initialsFrom(profile.display_name),
            rank: RANK_LADDER[0]!,
            level: 1,
            xp: 0,
            xpToNextLevel: 1000,
            currentStreak: 0,
            longestStreak: 0,
            labsCompleted: 0,
            challengesCompleted: 0,
            joinedAt: new Date(profile.created_at).toLocaleDateString(undefined, {
              month: "short",
              year: "numeric",
            }),
            tutorLanguage: auth.preferences?.preferred_tutor_language ?? "Mix both",
            comfortLevel: profile.linux_comfort_level,
            goal: "No learning path started yet.",
            path: "Not selected",
            skills: demo?.skills ?? [],
            personalBests: [] as { id: string; label: string; value: string; detail: string }[],
            recentBadges: [] as { id: string; label: string; earnedAt: string }[],
          };
          const best = me.skills.length ? strongestSkill(me.skills) : null;
          const worst = me.skills.length ? weakestSkill(me.skills) : null;
          const xpPct = Math.round((me.xp / me.xpToNextLevel) * 100);
          return (
            <>
              <Panel className="relative overflow-hidden">
                <div className="absolute inset-x-0 top-0 h-24 forge-grid opacity-40" />
                <div
                  className="absolute -right-20 -top-20 size-64 rounded-full opacity-20 blur-3xl"
                  style={{ background: "var(--gradient-forge)" }}
                />
                <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                    <span className="flex size-20 shrink-0 items-center justify-center rounded-2xl border border-border-strong bg-surface-2 font-mono text-xl text-primary">
                      {me.initials}
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="truncate font-display text-xl font-semibold">{me.displayName}</h2>
                        <Tag tone="primary">{me.rank}</Tag>
                        <span className="font-mono text-[11px] text-muted-foreground">Level {me.level}</span>
                      </div>
                      <p className="mt-1 font-mono text-xs text-muted-foreground">
                        @{me.handle} · {me.email}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5">
                          <Calendar className="size-3.5" /> Joined {me.joinedAt}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <Languages className="size-3.5" /> Tutor: {me.tutorLanguage}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <GraduationCap className="size-3.5" /> Linux level: {me.comfortLevel}
                        </span>
                        <Link to="/friends" className="inline-flex items-center gap-1.5 hover:text-foreground">
                          <Users className="size-3.5" /> View squad
                        </Link>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border bg-surface-2/50 p-4">
                    <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      Progress to level {me.level + 1}
                    </p>
                    <p className="mt-1 font-display text-lg font-semibold">
                      {me.xp.toLocaleString()} / {me.xpToNextLevel.toLocaleString()} XP
                    </p>
                    <ProgressBar className="mt-2" value={xpPct} />
                    <div className="mt-4 flex items-center gap-1.5">
                      {RANK_LADDER.map((r) => (
                        <span
                          key={r}
                          className={cn(
                            "flex-1 rounded-md border px-1.5 py-1 text-center font-mono text-[10px] uppercase",
                            r === me.rank
                              ? "border-primary/45 bg-primary/10 text-primary"
                              : "border-border bg-surface/60 text-muted-foreground",
                          )}
                        >
                          {r.slice(0, 4)}
                        </span>
                      ))}
                    </div>
                    <FutureTag className="mt-3" label="No XP recorded yet · awaits learning systems" />
                  </div>
                </div>
              </Panel>

              <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                  label="Current streak"
                  value={`${me.currentStreak} days`}
                  hint="No streak recorded yet"
                  icon={<Flame className="size-4" />}
                  tone="warn"
                />
                <StatCard
                  label="Labs completed"
                  value={String(me.labsCompleted)}
                  hint="No labs completed yet"
                  icon={<Target className="size-4" />}
                  tone="accent"
                />
                <StatCard
                  label="Challenges cleared"
                  value={String(me.challengesCompleted)}
                  hint="No challenges cleared yet"
                  icon={<Trophy className="size-4" />}
                />
                <StatCard
                  label="Forge rank"
                  value={me.rank}
                  hint={`Level ${me.level} · starting rank`}
                  icon={<TrendingUp className="size-4" />}
                  tone="signal"
                />
              </div>

              <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
                <div className="space-y-6">
                  <Panel>
                    <PanelHeader
                      title="Skill mastery"
                      subtitle="Preview of the curriculum system — not your recorded results"
                      action={<FutureTag label="Demo · curriculum stage" />}
                    />
                    {learner.status === "loading" ? <LoadingBlock rows={3} /> : null}
                    {me.skills.length === 0 ? (
                      <EmptyState
                        title="No skill data yet"
                        description="Mastery appears once the learning and lab systems record real outcomes."
                      />
                    ) : (
                      <>
                        <ul className="space-y-3.5">
                          {me.skills.map((s, i) => (
                            <li key={s.key}>
                              <div className="mb-1.5 flex items-center justify-between text-xs">
                                <span>{s.label}</span>
                                <span className="font-mono text-muted-foreground">{s.mastery}%</span>
                              </div>
                              <ProgressBar value={s.mastery} tone={i % 2 === 0 ? "primary" : "accent"} />
                            </li>
                          ))}
                        </ul>
                        {best && worst ? (
                          <>
                            <div className="mt-5 grid gap-3 sm:grid-cols-2">
                              <div className="rounded-lg border border-signal/30 bg-signal/8 p-3">
                                <p className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-signal">
                                  <TrendingUp className="size-3.5" /> Strongest
                                </p>
                                <p className="mt-1 text-sm font-medium">{best.label}</p>
                                <p className="text-xs text-muted-foreground">{best.mastery}% mastery</p>
                              </div>
                              <div className="rounded-lg border border-warn/30 bg-warn/8 p-3">
                                <p className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-warn">
                                  <TrendingDown className="size-3.5" /> Needs practice
                                </p>
                                <p className="mt-1 text-sm font-medium">{worst.label}</p>
                                <p className="text-xs text-muted-foreground">{worst.mastery}% mastery</p>
                              </div>
                            </div>
                            <Link
                              to="/challenges"
                              className={cn(buttonClass({ variant: "outline", size: "sm" }), "mt-4")}
                            >
                              Practise {worst.label}
                            </Link>
                          </>
                        ) : null}
                      </>
                    )}
                  </Panel>

                  <Panel>
                    <PanelHeader title="Personal bests" icon={<Target className="size-4" />} />
                    {me.personalBests.length === 0 ? (
                      <EmptyState title="No personal bests yet" description="Clear a lab to set your first record." />
                    ) : (
                      <ul className="grid gap-3 sm:grid-cols-3">
                        {me.personalBests.map((pb) => (
                          <li key={pb.id} className="rounded-lg border border-border bg-surface-2/50 p-3">
                            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                              {pb.label}
                            </p>
                            <p className="mt-1 font-display text-lg font-semibold text-primary">{pb.value}</p>
                            <p className="text-xs text-muted-foreground">{pb.detail}</p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </Panel>
                </div>

                <div className="space-y-6">
                  <Panel>
                    <PanelHeader title="Current goal" icon={<Sparkles className="size-4" />} />
                    <p className="text-sm leading-relaxed">{me.goal}</p>
                    <p className="mt-2 text-xs text-muted-foreground">Path: {me.path}</p>
                    <Link to="/learn" className={cn(buttonClass({ variant: "outline", size: "sm" }), "mt-4 w-full")}>
                      Continue path
                    </Link>
                  </Panel>

                  <Panel>
                    <PanelHeader title="Recent achievements" icon={<Award className="size-4" />} />
                    {me.recentBadges.length === 0 ? (
                      <EmptyState
                        title="No badges yet"
                        description="Badges unlock once challenges and labs start recording results."
                      />
                    ) : (
                      <ul className="space-y-2">
                        {me.recentBadges.map((b) => (
                          <li
                            key={b.id}
                            className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-2/50 px-3 py-2.5"
                          >
                            <span className="truncate text-xs">{b.label}</span>
                            <span className="shrink-0 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                              {b.earnedAt}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                    <Link
                      to="/achievements"
                      className={cn(buttonClass({ variant: "ghost", size: "sm" }), "mt-3 w-full")}
                    >
                      View all achievements
                    </Link>
                  </Panel>

                  <Panel>
                    <PanelHeader title="Public profile" subtitle="Control what squad mates see" />
                    <ul className="space-y-2 text-xs text-muted-foreground">
                      <li className="flex items-center justify-between rounded-lg border border-border bg-surface-2/50 px-3 py-2">
                        Rank &amp; badges <Tag tone="signal">Visible</Tag>
                      </li>
                      <li className="flex items-center justify-between rounded-lg border border-border bg-surface-2/50 px-3 py-2">
                        Streak <Tag tone="signal">Visible</Tag>
                      </li>
                      <li className="flex items-center justify-between rounded-lg border border-border bg-surface-2/50 px-3 py-2">
                        Email <Tag>Hidden</Tag>
                      </li>
                    </ul>
                    <Link to="/settings" className={cn(buttonClass({ variant: "ghost", size: "sm" }), "mt-3 w-full")}>
                      Privacy settings
                    </Link>
                  </Panel>
                </div>
              </div>
            </>
          );
        })()
      ) : null}
    </AppShell>
  );
}
