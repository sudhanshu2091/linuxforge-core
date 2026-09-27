import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Check,
  Clock,
  Crown,
  Flame,
  Search,
  Swords,
  Target,
  UserPlus,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import {
  Button,
  Field,
  FutureTag,
  Input,
  PageHeader,
  Panel,
  PanelHeader,
  ProgressBar,
  Tag,
  buttonClass,
} from "@/components/kit/primitives";
import { EmptyState, ErrorState, LoadingBlock } from "@/components/kit/states";
import {
  dailyChallenge,
  dailyResults,
  demoLearner,
  formatDuration,
  getSquadService,
  searchLearnersService,
  skillAverage,
  useAsync,
  type FriendRequest,
  type Learner,
} from "@/lib/learner-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/friends")({
  head: () => ({
    meta: [
      { title: "Squad — LinuxForge AI" },
      {
        name: "description",
        content:
          "Build a small learning squad: friends, requests, skill comparison and a leaderboard scoped to authorized labs.",
      },
      { property: "og:title", content: "Squad — LinuxForge AI" },
      {
        property: "og:description",
        content: "Friends, requests, comparison and a leaderboard scoped to authorized labs.",
      },
    ],
  }),
  component: FriendsPage,
});

type TabKey = "friends" | "requests" | "search" | "leaderboard";

const tabs: { key: TabKey; label: string; icon: typeof Users }[] = [
  { key: "friends", label: "Friends", icon: Users },
  { key: "requests", label: "Requests", icon: Clock },
  { key: "search", label: "Find learners", icon: Search },
  { key: "leaderboard", label: "Leaderboard", icon: Crown },
];

function Avatar({ initials, size = "md" }: { initials: string; size?: "sm" | "md" | "lg" }) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-xl border border-border-strong bg-surface-2 font-mono text-primary",
        size === "sm" && "size-8 text-[11px]",
        size === "md" && "size-10 text-xs",
        size === "lg" && "size-16 rounded-2xl text-lg",
      )}
    >
      {initials}
    </span>
  );
}

function FriendCard({
  friend,
  selected,
  onSelect,
}: {
  friend: Learner;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "w-full rounded-xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        selected
          ? "border-primary/45 bg-primary/8"
          : "border-border bg-surface/50 hover:border-border-strong hover:bg-surface-2/60",
      )}
    >
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar initials={friend.initials} />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{friend.displayName}</p>
            <p className="truncate font-mono text-[11px] text-muted-foreground">@{friend.handle}</p>
          </div>
        </div>
        <Tag tone="primary">{friend.rank}</Tag>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 font-mono text-[11px] text-muted-foreground">
        <span>{friend.xp.toLocaleString()} XP</span>
        <span className="inline-flex items-center gap-1">
          <Flame className="size-3 text-primary" /> {friend.currentStreak}d
        </span>
        <span className="text-right">{skillAverage(friend.skills)}% skill</span>
      </div>
      <ProgressBar className="mt-2" value={skillAverage(friend.skills)} tone="accent" />
    </button>
  );
}

function ComparisonRow({
  label,
  mine,
  theirs,
  better = "high",
}: {
  label: string;
  mine: string | number;
  theirs: string | number;
  better?: "high" | "low";
}) {
  const num = (v: string | number) => (typeof v === "number" ? v : Number.NaN);
  const a = num(mine);
  const b = num(theirs);
  let lead: "me" | "them" | "tie" = "tie";
  if (!Number.isNaN(a) && !Number.isNaN(b) && a !== b) {
    const meWins = better === "high" ? a > b : a < b;
    lead = meWins ? "me" : "them";
  }
  return (
    <tr className="border-t border-border">
      <td className="px-3 py-2.5 text-xs text-muted-foreground">{label}</td>
      <td
        className={cn("px-3 py-2.5 text-right font-mono text-xs", lead === "me" && "text-signal")}
      >
        {mine}
      </td>
      <td
        className={cn("px-3 py-2.5 text-right font-mono text-xs", lead === "them" && "text-signal")}
      >
        {theirs}
      </td>
    </tr>
  );
}

function FriendPreview({ friend }: { friend: Learner }) {
  const result = dailyResults[friend.id];
  const mine = dailyResults[demoLearner.id]!;
  return (
    <div className="space-y-6">
      <Panel>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <Avatar initials={friend.initials} size="lg" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate font-display text-lg font-semibold">{friend.displayName}</h2>
              <Tag tone="primary">{friend.rank}</Tag>
              <span className="font-mono text-[11px] text-muted-foreground">Lv {friend.level}</span>
            </div>
            <p className="mt-0.5 font-mono text-xs text-muted-foreground">@{friend.handle}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              {friend.path} · joined {friend.joinedAt}
            </p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "XP", value: friend.xp.toLocaleString() },
            { label: "Streak", value: `${friend.currentStreak}d` },
            { label: "Labs", value: String(friend.labsCompleted) },
            { label: "Challenges", value: String(friend.challengesCompleted) },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-lg border border-border bg-surface-2/50 px-3 py-2"
            >
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                {s.label}
              </p>
              <p className="mt-1 font-display text-base font-semibold">{s.value}</p>
            </div>
          ))}
        </div>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel>
          <PanelHeader title="Skill progress" subtitle="Earned from lab outcomes" />
          <ul className="space-y-3">
            {friend.skills.map((s, i) => (
              <li key={s.key}>
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span>{s.label}</span>
                  <span className="font-mono text-muted-foreground">{s.mastery}%</span>
                </div>
                <ProgressBar value={s.mastery} tone={i % 2 === 0 ? "primary" : "accent"} />
              </li>
            ))}
          </ul>
        </Panel>

        <Panel>
          <PanelHeader title="Personal bests" icon={<Target className="size-4" />} />
          <ul className="space-y-2">
            {friend.personalBests.map((pb) => (
              <li
                key={pb.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-2/50 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-xs">{pb.label}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{pb.detail}</p>
                </div>
                <span className="shrink-0 font-mono text-sm text-primary">{pb.value}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <Panel>
        <PanelHeader
          title="Head-to-head"
          subtitle={`Today's authorized challenge · ${dailyChallenge.title}`}
          icon={<Swords className="size-4" />}
          action={<Tag tone="signal">{dailyChallenge.scope}</Tag>}
        />
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[420px] text-sm">
            <thead className="bg-surface-2/60 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="px-3 py-2.5 text-left">Metric</th>
                <th className="px-3 py-2.5 text-right">You</th>
                <th className="px-3 py-2.5 text-right">{friend.handle}</th>
              </tr>
            </thead>
            <tbody>
              <ComparisonRow label="Score" mine={mine.score} theirs={result?.score ?? "—"} />
              <ComparisonRow
                label="Completion time"
                mine={formatDuration(mine.completionTime)}
                theirs={result ? formatDuration(result.completionTime) : "—"}
              />
              <ComparisonRow
                label="Attempts"
                mine={mine.attempts}
                theirs={result?.attempts ?? "—"}
                better="low"
              />
              <ComparisonRow
                label="Hints used"
                mine={mine.hintsUsed}
                theirs={result?.hintsUsed ?? "—"}
                better="low"
              />
              <ComparisonRow
                label="Skill average"
                mine={skillAverage(demoLearner.skills)}
                theirs={skillAverage(friend.skills)}
              />
              <ComparisonRow
                label="Longest streak"
                mine={demoLearner.longestStreak}
                theirs={friend.longestStreak}
              />
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Competition is limited to the same authorized learning challenge inside a sandboxed lab —
          never real systems.
        </p>
      </Panel>
    </div>
  );
}

function RequestRow({
  request,
  onAccept,
  onDecline,
  onCancel,
}: {
  request: FriendRequest;
  onAccept: () => void;
  onDecline: () => void;
  onCancel: () => void;
}) {
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-border bg-surface/50 p-4">
      <div className="flex min-w-0 items-center gap-3">
        <Avatar initials={request.learner.initials} />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{request.learner.displayName}</p>
          <p className="truncate font-mono text-[11px] text-muted-foreground">
            @{request.learner.handle} · {request.learner.rank} · {request.sentAt}
          </p>
        </div>
      </div>
      {request.direction === "incoming" ? (
        <div className="flex shrink-0 gap-2">
          <Button size="sm" onClick={onAccept}>
            <Check className="size-3.5" /> Accept
          </Button>
          <Button size="sm" variant="outline" onClick={onDecline}>
            <X className="size-3.5" /> Decline
          </Button>
        </div>
      ) : (
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Cancel request
        </Button>
      )}
    </li>
  );
}

function FriendsPage() {
  const [tab, setTab] = useState<TabKey>("friends");
  const squad = useAsync(getSquadService);

  const [friends, setFriends] = useState<Learner[] | null>(null);
  const [requests, setRequests] = useState<FriendRequest[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FriendRequest["learner"][] | null>(null);
  const [searching, setSearching] = useState(false);
  const [sent, setSent] = useState<string[]>([]);

  const liveFriends = friends ?? squad.data?.friends ?? [];
  const liveRequests = requests ?? squad.data?.requests ?? [];
  const incoming = liveRequests.filter((r) => r.direction === "incoming");
  const outgoing = liveRequests.filter((r) => r.direction === "outgoing");
  const selected = useMemo(
    () => liveFriends.find((f) => f.id === selectedId) ?? null,
    [liveFriends, selectedId],
  );

  const leaderboard = useMemo(
    () =>
      [demoLearner, ...liveFriends]
        .map((l) => ({ learner: l, result: dailyResults[l.id] }))
        .sort((a, b) => (b.result?.score ?? 0) - (a.result?.score ?? 0)),
    [liveFriends],
  );

  const acceptRequest = (id: string) => {
    const req = liveRequests.find((r) => r.id === id);
    setRequests(liveRequests.filter((r) => r.id !== id));
    if (req) {
      setFriends([
        ...liveFriends,
        {
          ...demoLearner,
          ...req.learner,
          email: "hidden",
          currentStreak: 1,
          longestStreak: 1,
          labsCompleted: 0,
          challengesCompleted: 0,
        },
      ]);
      setNotice(`${req.learner.displayName} joined your squad.`);
    }
  };

  const runSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearching(true);
    const res = await searchLearnersService(query);
    setResults(res);
    setSearching(false);
  };

  return (
    <AppShell>
      <PageHeader
        eyebrow="Squad"
        title="Learn beside people, not against the internet"
        description="Small squads keep the pressure friendly. Compare progress, accept requests and race the same authorized daily challenge."
        actions={
          <>
            <Link to="/dashboard" className={buttonClass({ variant: "ghost", size: "sm" })}>
              <ArrowLeft className="size-3.5" /> Dashboard
            </Link>
            <FutureTag label="Demo data · integration-ready" />
          </>
        }
      />

      {notice ? (
        <div className="mb-6 flex items-center justify-between gap-3 rounded-xl border border-signal/35 bg-signal/8 px-4 py-3 text-sm">
          <span className="text-signal">{notice}</span>
          <button
            onClick={() => setNotice(null)}
            aria-label="Dismiss"
            className="rounded-md p-1 text-muted-foreground hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ) : null}

      <div className="mb-6 flex gap-1 overflow-x-auto border-b border-border pb-px">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            aria-current={tab === t.key}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 rounded-t-lg px-4 py-2.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              tab === t.key
                ? "border-b-2 border-primary font-medium text-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <t.icon className="size-4" />
            {t.label}
            {t.key === "requests" && incoming.length > 0 ? (
              <span className="rounded-full bg-primary/15 px-1.5 font-mono text-[10px] text-primary">
                {incoming.length}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {squad.status === "loading" ? <LoadingBlock rows={4} /> : null}
      {squad.status === "error" ? (
        <ErrorState description={squad.error} onRetry={squad.reload} />
      ) : null}

      {squad.status === "success" && tab === "friends" ? (
        <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
          <div className="space-y-3">
            <Panel>
              <PanelHeader
                title="Your squad"
                subtitle={`${liveFriends.length} learner${liveFriends.length === 1 ? "" : "s"}`}
                icon={<Users className="size-4" />}
                action={
                  <Button variant="outline" size="sm" onClick={() => setTab("search")}>
                    <UserPlus className="size-3.5" /> Add
                  </Button>
                }
              />
              {liveFriends.length === 0 ? (
                <EmptyState
                  title="No friends yet"
                  description="Find a learner by forge handle and send the first request."
                  icon={<UserPlus className="size-4" />}
                  action={
                    <Button size="sm" onClick={() => setTab("search")}>
                      Find learners
                    </Button>
                  }
                />
              ) : (
                <div className="space-y-3">
                  {liveFriends.map((f) => (
                    <FriendCard
                      key={f.id}
                      friend={f}
                      selected={selectedId === f.id}
                      onSelect={() => setSelectedId(f.id)}
                    />
                  ))}
                </div>
              )}
            </Panel>
          </div>

          <div>
            {selected ? (
              <FriendPreview friend={selected} />
            ) : (
              <EmptyState
                title="Pick a squad mate"
                description="Select someone on the left to see rank, XP, streaks, skill progress, personal bests and a head-to-head comparison."
                icon={<UserRound className="size-4" />}
              />
            )}
          </div>
        </div>
      ) : null}

      {squad.status === "success" && tab === "requests" ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Panel>
            <PanelHeader
              title="Pending requests"
              subtitle="Incoming"
              icon={<Clock className="size-4" />}
            />
            {incoming.length === 0 ? (
              <EmptyState
                title="No pending requests"
                description="New invitations will appear here."
              />
            ) : (
              <ul className="space-y-3">
                {incoming.map((r) => (
                  <RequestRow
                    key={r.id}
                    request={r}
                    onAccept={() => acceptRequest(r.id)}
                    onDecline={() => {
                      setRequests(liveRequests.filter((x) => x.id !== r.id));
                      setNotice(`Request from ${r.learner.displayName} declined.`);
                    }}
                    onCancel={() => undefined}
                  />
                ))}
              </ul>
            )}
          </Panel>

          <Panel>
            <PanelHeader
              title="Sent requests"
              subtitle="Waiting on a reply"
              icon={<UserPlus className="size-4" />}
            />
            {outgoing.length === 0 ? (
              <EmptyState
                title="Nothing sent"
                description="Requests you send stay here until accepted."
              />
            ) : (
              <ul className="space-y-3">
                {outgoing.map((r) => (
                  <RequestRow
                    key={r.id}
                    request={r}
                    onAccept={() => undefined}
                    onDecline={() => undefined}
                    onCancel={() => {
                      setRequests(liveRequests.filter((x) => x.id !== r.id));
                      setNotice(`Request to ${r.learner.displayName} cancelled.`);
                    }}
                  />
                ))}
              </ul>
            )}
          </Panel>
        </div>
      ) : null}

      {squad.status === "success" && tab === "search" ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <Panel>
            <PanelHeader
              title="Find learners"
              subtitle="Search by name or forge handle"
              icon={<Search className="size-4" />}
            />
            <form onSubmit={runSearch} className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1">
                <Field label="Forge handle or name">
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="e.g. ananya_bash"
                  />
                </Field>
              </div>
              <Button type="submit" size="md" className="sm:mb-0">
                <Search className="size-3.5" /> Search
              </Button>
            </form>

            <div className="mt-5">
              {searching ? <LoadingBlock rows={2} /> : null}
              {!searching && results === null ? (
                <EmptyState
                  title="Search to add friends"
                  description="Try a handle like ananya_bash, dev_chmod or farhan_ufw."
                  icon={<Search className="size-4" />}
                />
              ) : null}
              {!searching && results?.length === 0 ? (
                <EmptyState
                  title="No learners matched"
                  description="Check the handle spelling, or invite them once accounts are live."
                />
              ) : null}
              {!searching && results && results.length > 0 ? (
                <ul className="space-y-3">
                  {results.map((l) => {
                    const isSent = sent.includes(l.id);
                    return (
                      <li
                        key={l.id}
                        className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-border bg-surface/50 p-4"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <Avatar initials={l.initials} />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{l.displayName}</p>
                            <p className="truncate font-mono text-[11px] text-muted-foreground">
                              @{l.handle} · {l.rank} · {l.xp.toLocaleString()} XP
                            </p>
                          </div>
                        </div>
                        {isSent ? (
                          <Tag tone="signal">
                            <Check className="size-3" /> Sent
                          </Tag>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSent((s) => [...s, l.id]);
                              setRequests([
                                ...liveRequests,
                                {
                                  id: `local-${l.id}`,
                                  direction: "outgoing",
                                  sentAt: "just now",
                                  learner: l,
                                },
                              ]);
                              setNotice(`Request sent to ${l.displayName}.`);
                            }}
                          >
                            <UserPlus className="size-3.5" /> Add
                          </Button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </div>
          </Panel>

          <Panel>
            <PanelHeader title="How squads work" />
            <ul className="space-y-2 text-xs leading-relaxed text-muted-foreground">
              <li>Requests need acceptance from both sides.</li>
              <li>Only rank, XP, streaks and lab results are shared.</li>
              <li>Email and account details are never visible to friends.</li>
            </ul>
            <FutureTag className="mt-4" label="Real accounts later" />
          </Panel>
        </div>
      ) : null}

      {squad.status === "success" && tab === "leaderboard" ? (
        <Panel>
          <PanelHeader
            title="Squad leaderboard"
            subtitle={`Same authorized challenge · ${dailyChallenge.title}`}
            icon={<Crown className="size-4" />}
            action={<Tag tone="signal">{dailyChallenge.scope}</Tag>}
          />
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-surface-2/60 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                <tr>
                  <th className="px-3 py-2.5 text-left">#</th>
                  <th className="px-3 py-2.5 text-left">Learner</th>
                  <th className="px-3 py-2.5 text-right">Score</th>
                  <th className="px-3 py-2.5 text-right">Time</th>
                  <th className="px-3 py-2.5 text-right">Attempts</th>
                  <th className="px-3 py-2.5 text-right">Hints</th>
                  <th className="px-3 py-2.5 text-right">Best PB</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {leaderboard.map((row, i) => (
                  <tr
                    key={row.learner.id}
                    className={cn(
                      "transition-colors hover:bg-surface-2/40",
                      row.learner.id === demoLearner.id && "bg-primary/5",
                    )}
                  >
                    <td className="px-3 py-3 font-mono text-xs text-muted-foreground">0{i + 1}</td>
                    <td className="px-3 py-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <Avatar initials={row.learner.initials} size="sm" />
                        <span className="truncate">
                          {row.learner.id === demoLearner.id ? "You" : row.learner.displayName}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right font-mono">{row.result?.score ?? "—"}</td>
                    <td className="px-3 py-3 text-right font-mono">
                      {row.result ? formatDuration(row.result.completionTime) : "—"}
                    </td>
                    <td className="px-3 py-3 text-right font-mono">
                      {row.result?.attempts ?? "—"}
                    </td>
                    <td className="px-3 py-3 text-right font-mono">
                      {row.result?.hintsUsed ?? "—"}
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-primary">
                      {row.learner.personalBests[2]?.value ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Improvement is measured against your own personal bests — standings only cover
            authorized challenges and labs.
          </p>
        </Panel>
      ) : null}
    </AppShell>
  );
}
