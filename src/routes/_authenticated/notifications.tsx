import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Bell, BellOff, Check, Flame, Trophy, Users } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { Button, FutureTag, PageHeader, Panel, PanelHeader, Tag, buttonClass } from "@/components/kit/primitives";
import { EmptyState, ErrorState, LoadingBlock } from "@/components/kit/states";
import { useAsync } from "@/lib/learner-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — LinuxForge AI" },
      {
        name: "description",
        content: "Streak reminders, squad activity and achievement unlocks in one quiet feed.",
      },
      { property: "og:title", content: "Notifications — LinuxForge AI" },
      { property: "og:description", content: "Streak reminders, squad activity and achievement unlocks." },
    ],
  }),
  component: NotificationsPage,
});

type Item = {
  id: string;
  icon: typeof Bell;
  tone: "primary" | "signal" | "accent";
  title: string;
  body: string;
  time: string;
};

const seed: Item[] = [
  {
    id: "n1",
    icon: Flame,
    tone: "primary",
    title: "Streak at risk",
    body: "Finish one drill today to keep your 12-day streak alive.",
    time: "20 min ago",
  },
  {
    id: "n2",
    icon: Users,
    tone: "accent",
    title: "Isha Rana sent a squad request",
    body: "Accept it from the Squad page to compare progress.",
    time: "2 hours ago",
  },
  {
    id: "n3",
    icon: Trophy,
    tone: "signal",
    title: "Badge unlocked — Permission Surgeon",
    body: "Cleared the sudoers repair lab without hints.",
    time: "2 days ago",
  },
];

async function getNotificationsService(): Promise<Item[]> {
  await new Promise((r) => setTimeout(r, 400));
  return seed;
}

function NotificationsPage() {
  const feed = useAsync(getNotificationsService);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [read, setRead] = useState<string[]>([]);

  const items = (feed.data ?? []).filter((i) => !dismissed.includes(i.id));

  return (
    <AppShell>
      <PageHeader
        eyebrow="Notifications"
        title="Only the nudges that move your learning"
        description="Streak warnings, squad activity and badge unlocks. Dismissing and marking read happen locally until accounts are wired."
        actions={
          <>
            <Link to="/dashboard" className={buttonClass({ variant: "ghost", size: "sm" })}>
              <ArrowLeft className="size-3.5" /> Dashboard
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRead(items.map((i) => i.id))}
              disabled={items.length === 0}
            >
              <Check className="size-3.5" /> Mark all read
            </Button>
            <Link to="/settings" className={buttonClass({ size: "sm" })}>
              Notification settings
            </Link>
          </>
        }
      />

      <Panel>
        <PanelHeader
          title="Recent activity"
          subtitle="Demo feed — integration-ready"
          icon={<Bell className="size-4" />}
          action={<FutureTag label="Live feed later" />}
        />

        {feed.status === "loading" ? <LoadingBlock rows={3} /> : null}
        {feed.status === "error" ? <ErrorState description={feed.error} onRetry={feed.reload} /> : null}
        {feed.status === "success" && items.length === 0 ? (
          <EmptyState
            title="You're all caught up"
            description="New streak, squad and achievement alerts will land here."
            icon={<BellOff className="size-4" />}
          />
        ) : null}
        {feed.status === "success" && items.length > 0 ? (
          <ul className="space-y-3">
            {items.map((i) => (
              <li
                key={i.id}
                className={cn(
                  "grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 rounded-xl border p-4 transition-colors",
                  read.includes(i.id)
                    ? "border-border bg-surface/40"
                    : "border-border-strong bg-surface-2/50 hover:bg-surface-2/70",
                )}
              >
                <span
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-lg border",
                    i.tone === "primary" && "border-primary/30 bg-primary/10 text-primary",
                    i.tone === "accent" && "border-accent/30 bg-accent/10 text-accent",
                    i.tone === "signal" && "border-signal/30 bg-signal/10 text-signal",
                  )}
                >
                  <i.icon className="size-4" />
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium">{i.title}</p>
                    {!read.includes(i.id) ? <Tag tone="primary">New</Tag> : null}
                  </div>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{i.body}</p>
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{i.time}</p>
                </div>
                <div className="flex shrink-0 flex-col gap-1.5 sm:flex-row">
                  <Button size="sm" variant="ghost" onClick={() => setRead((r) => [...new Set([...r, i.id])])}>
                    Read
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setDismissed((d) => [...d, i.id])}>
                    Dismiss
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </Panel>
    </AppShell>
  );
}
