import { createFileRoute } from "@tanstack/react-router";
import { Award, Flame, Lock, Medal, ShieldCheck, Sparkles, Terminal, Trophy } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import {
  FutureSurface,
  FutureTag,
  PageHeader,
  Panel,
  PanelHeader,
  ProgressBar,
  Tag,
} from "@/components/kit/primitives";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/achievements")({
  head: () => ({
    meta: [
      { title: "Achievements — LinuxForge AI" },
      {
        name: "description",
        content: "Forge badges, ranks and milestones earned through verified Linux and defensive security drills.",
      },
      { property: "og:title", content: "Achievements — LinuxForge AI" },
      { property: "og:description", content: "Badges, ranks and milestones earned through verified drills." },
    ],
  }),
  component: AchievementsPage,
});

const badges = [
  { name: "First Command", icon: Terminal, note: "Ran your first drill" },
  { name: "Permission Smith", icon: ShieldCheck, note: "Cleared all permission labs" },
  { name: "Seven-Day Forge", icon: Flame, note: "Seven-day streak" },
  { name: "Log Reader", icon: Award, note: "Traced an incident from logs" },
  { name: "Hardener", icon: Medal, note: "Locked down a service to policy" },
  { name: "Mentor's Pick", icon: Sparkles, note: "Explained a concept back perfectly" },
  { name: "Process Whisperer", icon: Trophy, note: "Diagnosed three runaway processes" },
  { name: "Architect", icon: Trophy, note: "Reached the final rank" },
];

function AchievementsPage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="Achievements"
        title="Proof you can point at"
        description="Badges unlock from verified lab outcomes and consistency — never from clicking through content."
        actions={<FutureTag label="Unlock logic later" />}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Panel>
            <PanelHeader title="Badge collection" subtitle="0 of 8 unlocked in this preview" icon={<Award className="size-4" />} />
            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {badges.map((b) => (
                <div
                  key={b.name}
                  className={cn(
                    "group relative rounded-xl border border-border bg-surface-2/40 p-4 text-center transition-colors hover:border-border-strong",
                  )}
                >
                  <span className="mx-auto flex size-12 items-center justify-center rounded-xl border border-border bg-surface text-muted-foreground">
                    <b.icon className="size-5" />
                  </span>
                  <p className="mt-3 text-xs font-semibold">{b.name}</p>
                  <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{b.note}</p>
                  <span className="mt-3 inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    <Lock className="size-3" /> Locked
                  </span>
                </div>
              ))}
            </div>
          </Panel>

          <FutureSurface
            icon={<Sparkles className="size-5" />}
            title="Unlock celebrations"
            description="Badge reveal animations and shareable cards land with the progression stage."
          />
        </div>

        <div className="space-y-6">
          <Panel>
            <PanelHeader title="Current rank" icon={<Trophy className="size-4" />} />
            <div className="rounded-xl border border-primary/25 bg-primary/8 p-4 text-center">
              <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                <Trophy className="size-6" />
              </span>
              <p className="mt-3 font-display text-lg font-semibold">Recruit</p>
              <p className="text-xs text-muted-foreground">Next: Operator</p>
              <ProgressBar className="mt-4" value={0} />
            </div>
          </Panel>

          <Panel>
            <PanelHeader title="Milestones" subtitle="Bigger, rarer goals" />
            <ul className="space-y-2">
              {["Clear 25 labs", "30-day streak", "All hardening units", "Top of your squad"].map((m) => (
                <li
                  key={m}
                  className="flex items-center justify-between rounded-lg border border-border bg-surface-2/50 px-3 py-2.5 text-sm"
                >
                  {m}
                  <Tag>Pending</Tag>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}
