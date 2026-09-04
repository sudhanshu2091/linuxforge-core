import { createFileRoute } from "@tanstack/react-router";
import { Crown, Flame, Search, Swords, UserPlus, Users } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import {
  Button,
  FutureSurface,
  FutureTag,
  Input,
  PageHeader,
  Panel,
  PanelHeader,
  Tag,
} from "@/components/kit/primitives";

export const Route = createFileRoute("/friends")({
  head: () => ({
    meta: [
      { title: "Squad — LinuxForge AI" },
      {
        name: "description",
        content: "Build a small learning squad, compare streaks and take on friendly Linux skill duels.",
      },
      { property: "og:title", content: "Squad — LinuxForge AI" },
      { property: "og:description", content: "Compare streaks and take on friendly Linux skill duels." },
    ],
  }),
  component: FriendsPage,
});

const seats = ["Open seat", "Open seat", "Open seat", "Open seat"];

function FriendsPage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="Squad"
        title="Learn beside people, not against the internet"
        description="Small squads keep the pressure friendly. Compare streaks, send drills to each other, and duel on a shared lab."
        actions={<FutureTag label="Social features later" />}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <Panel>
            <PanelHeader
              title="Your squad"
              subtitle="Up to four learners"
              icon={<Users className="size-4" />}
              action={
                <Button variant="outline" size="sm" disabled>
                  <UserPlus className="size-3.5" /> Invite
                </Button>
              }
            />
            <div className="grid gap-3 sm:grid-cols-2">
              {seats.map((s, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-xl border border-dashed border-border-strong bg-surface/40 p-4"
                >
                  <span className="flex size-10 items-center justify-center rounded-xl border border-border bg-surface-2 text-muted-foreground">
                    <UserPlus className="size-4" />
                  </span>
                  <div>
                    <p className="text-sm font-medium">{s}</p>
                    <p className="text-[11px] text-muted-foreground">Invites open with the account stage</p>
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel>
            <PanelHeader title="Leaderboard" subtitle="Weekly XP among friends" icon={<Crown className="size-4" />} />
            <div className="overflow-hidden rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-surface-2/60 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2.5 text-left">#</th>
                    <th className="px-3 py-2.5 text-left">Learner</th>
                    <th className="px-3 py-2.5 text-left">Rank</th>
                    <th className="px-3 py-2.5 text-right">XP</th>
                    <th className="px-3 py-2.5 text-right">Streak</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {[1, 2, 3, 4].map((n) => (
                    <tr key={n} className="text-muted-foreground">
                      <td className="px-3 py-3 font-mono text-xs">0{n}</td>
                      <td className="px-3 py-3">—</td>
                      <td className="px-3 py-3">—</td>
                      <td className="px-3 py-3 text-right font-mono">—</td>
                      <td className="px-3 py-3 text-right font-mono">—</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">Standings populate when shared progress is connected.</p>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel>
            <PanelHeader title="Find learners" icon={<Search className="size-4" />} />
            <Input placeholder="Search by forge handle" disabled />
            <p className="mt-2 text-[11px] text-muted-foreground">Search activates with accounts.</p>
          </Panel>

          <Panel>
            <PanelHeader title="Skill duel" subtitle="Same lab, same clock" icon={<Swords className="size-4" />} />
            <p className="text-sm leading-relaxed text-muted-foreground">
              Challenge a squad mate to the same sandbox mission and compare objective completion, not typing speed.
            </p>
            <Button size="sm" className="mt-4 w-full" disabled>
              Start a duel
            </Button>
          </Panel>

          <FutureSurface
            icon={<Flame className="size-5" />}
            title="Squad streak"
            description="A shared streak that survives as long as someone in the squad practises daily."
          />

          <Panel>
            <PanelHeader title="Privacy" />
            <Tag tone="signal">Progress shared with squad only</Tag>
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}
