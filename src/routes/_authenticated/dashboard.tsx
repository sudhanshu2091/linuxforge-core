import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Bot,
  Flame,
  GraduationCap,
  Swords,
  Target,
  Trophy,
  Zap,
  Activity,
} from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import {
  FutureSurface,
  FutureTag,
  Panel,
  PanelHeader,
  PageHeader,
  ProgressBar,
  StatCard,
  Tag,
  buttonClass,
} from "@/components/kit/primitives";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Command Deck — LinuxForge AI" },
      {
        name: "description",
        content: "Your LinuxForge AI command deck: today's drill, active path, streaks and mentor nudges.",
      },
      { property: "og:title", content: "Command Deck — LinuxForge AI" },
      { property: "og:description", content: "Today's drill, active path, streaks and mentor nudges." },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="Command deck"
        title="Good to see you back at the forge"
        description="A single screen for what to practise next, where your momentum is, and what your mentor wants you to revisit."
        actions={
          <>
            <Link to="/learn" className={buttonClass({ variant: "outline", size: "sm" })}>
              Resume path
            </Link>
            <Link to="/challenges" className={buttonClass({ size: "sm" })}>
              Today's drill
              <ArrowRight className="size-3.5" />
            </Link>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Forge rank" value="—" hint="Recruit → Architect" icon={<Trophy className="size-4" />} />
        <StatCard label="Streak" value="—" hint="Daily drill streak" icon={<Flame className="size-4" />} tone="warn" />
        <StatCard label="XP this week" value="—" hint="Earned from drills" icon={<Zap className="size-4" />} tone="accent" />
        <StatCard label="Labs cleared" value="—" hint="Verified objectives" icon={<Target className="size-4" />} tone="signal" />
      </div>
      <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
        <FutureTag label="Learner data later" /> These figures fill in when learner progress is connected.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Panel>
            <PanelHeader
              title="Continue where you stopped"
              subtitle="Linux Foundations · Unit 7 — File permissions"
              icon={<GraduationCap className="size-4" />}
              action={<Tag tone="primary">Active path</Tag>}
            />
            <ProgressBar value={0} />
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {["Read the concept", "Run the drill", "Explain it back"].map((step, i) => (
                <div key={step} className="rounded-lg border border-border bg-surface-2/50 p-3">
                  <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                    Step {i + 1}
                  </p>
                  <p className="mt-1 text-sm">{step}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link to="/learn" className={buttonClass({ size: "sm" })}>
                Open unit
              </Link>
              <Link to="/terminal" className={buttonClass({ variant: "outline", size: "sm" })}>
                Practise in sandbox
              </Link>
            </div>
          </Panel>

          <Panel>
            <PanelHeader
              title="Recommended missions"
              subtitle="Chosen to match your weakest skill branch"
              icon={<Swords className="size-4" />}
              action={<FutureTag label="Ranking later" />}
            />
            <ul className="divide-y divide-border">
              {[
                { name: "Permissions rescue", level: "Recruit", pts: "120 XP" },
                { name: "Hunt the runaway process", level: "Operator", pts: "180 XP" },
                { name: "Read the auth log", level: "Operator", pts: "200 XP" },
              ].map((m) => (
                <li key={m.name} className="flex items-center gap-3 py-3">
                  <span className="flex size-8 items-center justify-center rounded-lg border border-border bg-surface-2 text-primary">
                    <Swords className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{m.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {m.level} · {m.pts}
                    </p>
                  </div>
                  <Link
                    to="/challenges"
                    className={buttonClass({ variant: "ghost", size: "sm" }) + " ml-auto shrink-0"}
                  >
                    View
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>

          <FutureSurface
            icon={<Activity className="size-5" />}
            title="Activity heatmap"
            description="Daily practice intensity renders here once session history is available."
          />
        </div>

        <div className="space-y-6">
          <Panel>
            <PanelHeader
              title="Mentor nudge"
              subtitle="Friendly, specific, never preachy"
              icon={<Bot className="size-4" />}
            />
            <div className="rounded-lg border border-primary/25 bg-primary/8 p-3 text-sm leading-relaxed text-muted-foreground">
              "Tumhara permissions concept almost set hai — bas symbolic vs numeric mode ek baar dohra lo. Two
              minutes ka kaam hai."
            </div>
            <Link to="/tutor" className={buttonClass({ variant: "outline", size: "sm" }) + " mt-4 w-full"}>
              Talk to your mentor
            </Link>
            <p className="mt-2 text-center text-[11px] text-muted-foreground">
              Sample copy — tutoring intelligence connects later.
            </p>
          </Panel>

          <Panel>
            <PanelHeader title="Skill branches" subtitle="Unlock by proving in labs" />
            <ul className="space-y-3">
              {[
                { name: "Filesystem", pct: 0 },
                { name: "Permissions", pct: 0 },
                { name: "Processes", pct: 0 },
                { name: "Networking", pct: 0 },
                { name: "Hardening", pct: 0 },
              ].map((s) => (
                <li key={s.name}>
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span>{s.name}</span>
                    <span className="font-mono text-muted-foreground">—</span>
                  </div>
                  <ProgressBar value={s.pct} tone="accent" />
                </li>
              ))}
            </ul>
          </Panel>

          <Panel>
            <PanelHeader title="Squad standings" subtitle="Friends only, no strangers" />
            <FutureSurface
              title="Leaderboard"
              description="Ranks appear when friends and shared progress are connected."
            />
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}
