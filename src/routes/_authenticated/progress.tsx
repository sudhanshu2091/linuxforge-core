import { createFileRoute } from "@tanstack/react-router";
import { Activity, CalendarDays, Flame, Gauge, LineChart, Target, TrendingUp } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import {
  FutureSurface,
  FutureTag,
  PageHeader,
  Panel,
  PanelHeader,
  ProgressBar,
  StatCard,
  Tag,
} from "@/components/kit/primitives";

export const Route = createFileRoute("/_authenticated/progress")({
  head: () => ({
    meta: [
      { title: "Progress — LinuxForge AI" },
      {
        name: "description",
        content: "Track skill growth, streaks and drill accuracy across your Linux and security learning paths.",
      },
      { property: "og:title", content: "Progress — LinuxForge AI" },
      { property: "og:description", content: "Track skill growth, streaks and drill accuracy over time." },
    ],
  }),
  component: ProgressPage,
});

const skills = ["Filesystem", "Permissions", "Processes", "Networking", "Logs & monitoring", "Hardening"];
const ranks = ["Recruit", "Operator", "Specialist", "Architect"];

function ProgressPage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="Progress"
        title="Where your skills actually stand"
        description="Progress here comes from verified drills, not from time spent reading. Charts and history render once learner data is connected."
        actions={<FutureTag label="Learner data later" />}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Rank progress" value="—" hint="Toward next rank" icon={<TrendingUp className="size-4" />} />
        <StatCard label="Drill accuracy" value="—" hint="First-try success" icon={<Target className="size-4" />} tone="signal" />
        <StatCard label="Best streak" value="—" hint="Consecutive days" icon={<Flame className="size-4" />} tone="warn" />
        <StatCard label="Time on task" value="—" hint="Hands-on minutes" icon={<Gauge className="size-4" />} tone="accent" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <Panel>
            <PanelHeader title="Skill growth over time" subtitle="Weekly XP by branch" icon={<LineChart className="size-4" />} />
            <FutureSurface
              className="min-h-56"
              icon={<LineChart className="size-5" />}
              title="Chart area"
              description="A weekly XP trend by skill branch renders here once progress history exists."
            />
          </Panel>

          <Panel>
            <PanelHeader title="Practice calendar" subtitle="Consistency beats intensity" icon={<CalendarDays className="size-4" />} />
            <div className="grid grid-cols-[repeat(26,minmax(0,1fr))] gap-1">
              {Array.from({ length: 104 }).map((_, i) => (
                <span key={i} className="aspect-square rounded-[3px] border border-border bg-surface-2/60" />
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Each cell will shade by practice volume for that day.
            </p>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel>
            <PanelHeader title="Skill branches" icon={<Activity className="size-4" />} />
            <ul className="space-y-3.5">
              {skills.map((s, i) => (
                <li key={s}>
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span>{s}</span>
                    <span className="font-mono text-muted-foreground">—</span>
                  </div>
                  <ProgressBar value={0} tone={i % 2 === 0 ? "primary" : "accent"} />
                </li>
              ))}
            </ul>
          </Panel>

          <Panel>
            <PanelHeader title="Rank ladder" subtitle="Four tiers, earned in labs" />
            <ol className="space-y-2">
              {ranks.map((r, i) => (
                <li
                  key={r}
                  className="flex items-center justify-between rounded-lg border border-border bg-surface-2/50 px-3 py-2.5 text-sm"
                >
                  <span className="flex items-center gap-2.5">
                    <span className="font-mono text-[11px] text-muted-foreground">0{i + 1}</span>
                    {r}
                  </span>
                  <Tag>{i === 0 ? "Current tier" : "Locked"}</Tag>
                </li>
              ))}
            </ol>
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}
