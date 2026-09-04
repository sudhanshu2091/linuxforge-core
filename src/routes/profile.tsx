import { createFileRoute, Link } from "@tanstack/react-router";
import { Award, Calendar, Edit3, Flame, MapPin, Share2, Target, Trophy, Users } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import {
  Button,
  FutureSurface,
  FutureTag,
  PageHeader,
  Panel,
  PanelHeader,
  ProgressBar,
  StatCard,
  Tag,
  buttonClass,
} from "@/components/kit/primitives";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profile — LinuxForge AI" },
      {
        name: "description",
        content: "Your LinuxForge AI forge identity: rank, skill branches, badges and squad in one place.",
      },
      { property: "og:title", content: "Profile — LinuxForge AI" },
      { property: "og:description", content: "Your forge identity: rank, skills, badges and squad." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="Profile"
        title="Your forge identity"
        description="A shareable snapshot of what you've actually proved — rank, verified skills and the drills behind them."
        actions={
          <>
            <Button variant="outline" size="sm" disabled>
              <Share2 className="size-3.5" /> Share
            </Button>
            <Link to="/settings" className={buttonClass({ size: "sm" })}>
              <Edit3 className="size-3.5" /> Edit profile
            </Link>
          </>
        }
      />

      <Panel className="relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-24 forge-grid opacity-40" />
        <div
          className="absolute -right-20 -top-20 size-64 rounded-full opacity-20 blur-3xl"
          style={{ background: "var(--gradient-forge)" }}
        />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
          <span className="flex size-20 shrink-0 items-center justify-center rounded-2xl border border-border-strong bg-surface-2 font-mono text-xl text-primary">
            LF
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-xl font-semibold">Guest learner</h2>
              <Tag tone="primary">Recruit</Tag>
            </div>
            <p className="mt-1 font-mono text-xs text-muted-foreground">@forge_handle</p>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">
              A short bio lives here — what you're learning, and what you want to be able to do six months from now.
            </p>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-3.5" /> Location
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="size-3.5" /> Joined —
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Users className="size-3.5" /> No squad yet
              </span>
            </div>
          </div>
          <FutureTag className="sm:ml-auto sm:self-start" label="Profile data later" />
        </div>
      </Panel>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Rank" value="Recruit" hint="Tier 1 of 4" icon={<Trophy className="size-4" />} />
        <StatCard label="Total XP" value="—" icon={<Target className="size-4" />} tone="accent" />
        <StatCard label="Streak" value="—" icon={<Flame className="size-4" />} tone="warn" />
        <StatCard label="Badges" value="0 / 8" icon={<Award className="size-4" />} tone="signal" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <Panel>
            <PanelHeader title="Verified skills" subtitle="Earned from lab outcomes" />
            <ul className="space-y-3.5">
              {["Filesystem", "Permissions", "Processes", "Networking", "Hardening"].map((s, i) => (
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

          <FutureSurface
            title="Recent activity feed"
            description="Completed units, cleared labs and badge unlocks appear here once learner history is connected."
          />
        </div>

        <div className="space-y-6">
          <Panel>
            <PanelHeader title="Badge case" icon={<Award className="size-4" />} />
            <div className="grid grid-cols-4 gap-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <span
                  key={i}
                  className="flex aspect-square items-center justify-center rounded-lg border border-dashed border-border-strong bg-surface/40 text-muted-foreground"
                >
                  <Award className="size-4" />
                </span>
              ))}
            </div>
            <Link to="/achievements" className={buttonClass({ variant: "ghost", size: "sm" }) + " mt-3 w-full"}>
              View all achievements
            </Link>
          </Panel>

          <Panel>
            <PanelHeader title="Public profile" subtitle="Control what others see" />
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li className="flex items-center justify-between rounded-lg border border-border bg-surface-2/50 px-3 py-2">
                Rank &amp; badges <Tag tone="signal">Visible</Tag>
              </li>
              <li className="flex items-center justify-between rounded-lg border border-border bg-surface-2/50 px-3 py-2">
                Streak <Tag tone="signal">Visible</Tag>
              </li>
              <li className="flex items-center justify-between rounded-lg border border-border bg-surface-2/50 px-3 py-2">
                Lab attempts <Tag>Hidden</Tag>
              </li>
            </ul>
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}
