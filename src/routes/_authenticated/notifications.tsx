import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Bell, BellOff, Check, Flame, Target, Trophy } from "lucide-react";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/app/AppShell";
import {
  Button,
  PageHeader,
  Panel,
  PanelHeader,
  Tag,
  buttonClass,
} from "@/components/kit/primitives";
import { EmptyState, ErrorState, LoadingBlock } from "@/components/kit/states";
import { useLearnerOverview } from "@/lib/learner/use-learner-overview";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — LinuxForge AI" },
      { name: "description", content: "Live learner nudges based on your recorded progress." },
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
};

function NotificationsPage() {
  const { data, loading, error, reload } = useLearnerOverview();
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [read, setRead] = useState<string[]>([]);
  const items = useMemo<Item[]>(() => {
    if (!data) return [];
    const result: Item[] = [];
    if (data.currentStreak > 0)
      result.push({
        id: "streak",
        icon: Flame,
        tone: "primary",
        title: "Keep the streak alive",
        body: `You're on a ${data.currentStreak}-day streak. One focused drill today keeps the momentum going.`,
      });
    if (data.progression.challengesCompleted > 0)
      result.push({
        id: "progress",
        icon: Trophy,
        tone: "signal",
        title: `${data.progression.challengesCompleted} challenges cleared`,
        body: `Your verified accuracy is ${data.accuracy}%. Keep using real outcomes to build mastery.`,
      });
    const due = data.skills
      .filter((s) => s.nextReview && new Date(s.nextReview).getTime() <= Date.now())
      .sort((a, b) => a.mastery - b.mastery)[0];
    if (due)
      result.push({
        id: `review-${due.id}`,
        icon: Target,
        tone: "accent",
        title: `${due.label} is due for review`,
        body: `A short retrieval drill now will strengthen retention before you move on.`,
      });
    if (data.progression.challengesCompleted === 0)
      result.push({
        id: "first-mission",
        icon: Target,
        tone: "accent",
        title: "Your first mission is waiting",
        body: "Start C01 and let the learner model learn from your actual terminal work.",
      });
    return result;
  }, [data]);
  const visible = items.filter((item) => !dismissed.includes(item.id));

  if (loading && !data)
    return (
      <AppShell>
        <PageHeader
          eyebrow="Notifications"
          title="Loading your mentor nudges"
          description="Building the feed from your live learner state."
        />
        <LoadingBlock rows={4} />
      </AppShell>
    );
  if (error && !data)
    return (
      <AppShell>
        <PageHeader
          eyebrow="Notifications"
          title="Notifications are temporarily unavailable"
          description="Your account is safe."
        />
        <ErrorState description={error} onRetry={() => void reload()} />
      </AppShell>
    );

  return (
    <AppShell>
      <PageHeader
        eyebrow="Notifications"
        title="Only the nudges that move your learning"
        description="These are derived from your recorded progress, not a demo feed."
        actions={
          <>
            <Link to="/dashboard" className={buttonClass({ variant: "ghost", size: "sm" })}>
              <ArrowLeft className="size-3.5" /> Dashboard
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRead(visible.map((i) => i.id))}
              disabled={!visible.length}
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
          subtitle={`${visible.length} live nudge${visible.length === 1 ? "" : "s"}`}
          icon={<Bell className="size-4" />}
        />
        {visible.length === 0 ? (
          <EmptyState
            title="You're all caught up"
            description="No new learner nudges right now."
            icon={<BellOff className="size-4" />}
          />
        ) : (
          <ul className="space-y-3">
            {visible.map((item) => (
              <li
                key={item.id}
                className={cn(
                  "grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 rounded-xl border p-4",
                  read.includes(item.id)
                    ? "border-border bg-surface/40"
                    : "border-border-strong bg-surface-2/50",
                )}
              >
                <span
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-lg border",
                    item.tone === "primary" && "border-primary/30 bg-primary/10 text-primary",
                    item.tone === "accent" && "border-accent/30 bg-accent/10 text-accent",
                    item.tone === "signal" && "border-signal/30 bg-signal/10 text-signal",
                  )}
                >
                  <item.icon className="size-4" />
                </span>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium">{item.title}</p>
                    {!read.includes(item.id) ? <Tag tone="primary">New</Tag> : null}
                  </div>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                    {item.body}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setRead((r) => [...new Set([...r, item.id])])}
                  >
                    Read
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setDismissed((d) => [...d, item.id])}
                  >
                    Dismiss
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </AppShell>
  );
}
