import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Accessibility,
  ArrowLeft,
  Bell,
  Eye,
  GraduationCap,
  Languages,
  Lock,
  ShieldCheck,
  SquareTerminal,
  Trash2,
  UserRound,
} from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import {
  Button,
  Field,
  FutureSurface,
  FutureTag,
  Input,
  PageHeader,
  Panel,
  PanelHeader,
  Tag,
  buttonClass,
} from "@/components/kit/primitives";
import { demoLearner } from "@/lib/learner-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — LinuxForge AI" },
      {
        name: "description",
        content:
          "Account, learning, AI tutor, accessibility, notification, privacy, security and lab-safety settings for LinuxForge AI.",
      },
      { property: "og:title", content: "Settings — LinuxForge AI" },
      { property: "og:description", content: "Account, learning, tutor, privacy, security and lab safety." },
    ],
  }),
  component: SettingsPage,
});

type SectionId =
  | "account"
  | "learning"
  | "tutor"
  | "accessibility"
  | "notifications"
  | "privacy"
  | "security"
  | "safety";

const sections: { id: SectionId; label: string; icon: typeof UserRound }[] = [
  { id: "account", label: "Account", icon: UserRound },
  { id: "learning", label: "Learning", icon: GraduationCap },
  { id: "tutor", label: "AI Tutor", icon: Languages },
  { id: "accessibility", label: "Accessibility", icon: Accessibility },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "privacy", label: "Privacy", icon: Eye },
  { id: "security", label: "Security", icon: Lock },
  { id: "safety", label: "Terminal & lab safety", icon: ShieldCheck },
];

function Toggle({ label, description, on = false }: { label: string; description?: string; on?: boolean }) {
  const [checked, setChecked] = useState(on);
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border py-3.5 last:border-0">
      <div className="min-w-0">
        <p className="text-sm">{label}</p>
        {description ? <p className="mt-0.5 text-xs text-muted-foreground">{description}</p> : null}
      </div>
      <button
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => setChecked((v) => !v)}
        className={cn(
          "mt-0.5 h-5 w-9 shrink-0 rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          checked ? "border-primary/50 bg-primary/80" : "border-border bg-surface-2",
        )}
      >
        <span
          className={cn(
            "block size-3.5 rounded-full bg-background transition-transform",
            checked ? "ml-0.5 translate-x-4" : "ml-0.5",
          )}
        />
      </button>
    </div>
  );
}

function Choices({
  options,
  initial = 0,
  tone = "accent",
}: {
  options: string[];
  initial?: number;
  tone?: "accent" | "primary";
}) {
  const [i, setI] = useState(initial);
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {options.map((o, idx) => (
        <button
          key={o}
          onClick={() => setI(idx)}
          aria-pressed={i === idx}
          className={cn(
            "rounded-lg border px-3 py-2.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            i === idx
              ? tone === "accent"
                ? "border-accent/45 bg-accent/10 text-accent"
                : "border-primary/45 bg-primary/10 text-primary"
              : "border-border bg-surface/60 text-muted-foreground hover:text-foreground",
          )}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

function SettingsPage() {
  const [active, setActive] = useState<SectionId>("account");
  const [saved, setSaved] = useState(false);

  return (
    <AppShell>
      <PageHeader
        eyebrow="Settings"
        title="Tune the forge to how you learn"
        description="Choices apply to this session now; persistence arrives with the account and learner-data integration."
        actions={
          <>
            <Link to="/profile" className={buttonClass({ variant: "ghost", size: "sm" })}>
              <ArrowLeft className="size-3.5" /> Profile
            </Link>
            <FutureTag label="Saving to account later" />
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[230px_1fr]">
        <nav aria-label="Settings sections" className="lg:sticky lg:top-24 lg:self-start">
          <ul className="flex gap-1 overflow-x-auto lg:flex-col">
            {sections.map((s) => (
              <li key={s.id} className="shrink-0">
                <button
                  onClick={() => setActive(s.id)}
                  aria-current={active === s.id}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    active === s.id
                      ? "bg-primary/10 font-medium text-primary"
                      : "text-muted-foreground hover:bg-surface hover:text-foreground",
                  )}
                >
                  <s.icon className="size-4 shrink-0" />
                  <span className="truncate">{s.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="space-y-6">
          {active === "account" ? (
            <Panel>
              <PanelHeader title="Account" subtitle="How you appear in the forge" icon={<UserRound className="size-4" />} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Display name">
                  <Input defaultValue={demoLearner.displayName} />
                </Field>
                <Field label="Forge handle" hint="Squad mates find you with this.">
                  <Input defaultValue={demoLearner.handle} />
                </Field>
                <Field label="Email">
                  <Input type="email" defaultValue={demoLearner.email} />
                </Field>
                <Field label="Location">
                  <Input defaultValue={demoLearner.location} />
                </Field>
              </div>
              <div className="mt-4 flex items-center gap-3">
                <Button size="sm" onClick={() => setSaved(true)}>
                  Save changes
                </Button>
                {saved ? <Tag tone="signal">Saved locally (demo)</Tag> : null}
              </div>
            </Panel>
          ) : null}

          {active === "learning" ? (
            <Panel>
              <PanelHeader title="Learning" subtitle="Pace, path and daily target" icon={<GraduationCap className="size-4" />} />
              <p className="mb-2 text-xs text-muted-foreground">Daily target</p>
              <Choices options={["1 drill", "3 drills", "1 full lab"]} initial={1} tone="primary" />
              <p className="mb-2 mt-5 text-xs text-muted-foreground">Difficulty preference</p>
              <Choices options={["Gentle", "Balanced", "Push me"]} initial={1} tone="primary" />
              <div className="mt-4">
                <Toggle label="Adaptive sequencing" description="Reorder units around the skills you keep missing." on />
                <Toggle label="Show command cheatsheet in labs" on />
                <Toggle label="Weekend rest days" description="Streak pauses instead of breaking." />
              </div>
              <Link to="/learn" className={cn(buttonClass({ variant: "outline", size: "sm" }), "mt-4")}>
                Open learning paths
              </Link>
            </Panel>
          ) : null}

          {active === "tutor" ? (
            <Panel>
              <PanelHeader
                title="AI Tutor"
                subtitle="Hinglish is a first-class option, not a translation toggle"
                icon={<Languages className="size-4" />}
              />
              <p className="mb-2 text-xs text-muted-foreground">Tutor language</p>
              <Choices options={["English", "Hinglish", "Mix (auto)"]} initial={2} />
              <p className="mb-2 mt-5 text-xs text-muted-foreground">Explanation depth</p>
              <Choices options={["Quick", "Guided", "Deep dive"]} initial={1} />
              <div className="mt-4">
                <Toggle label="Keep technical terms in English" description="chmod stays chmod, explanation stays natural." on />
                <Toggle label="Suggest a drill after every explanation" on />
                <Toggle label="Nudge me when I repeat a mistake" />
                <Toggle label="Mentor tone: friendly senior engineer" on />
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Tutor responses connect at the AI integration stage — nothing is generated yet.
              </p>
            </Panel>
          ) : null}

          {active === "accessibility" ? (
            <Panel>
              <PanelHeader title="Accessibility" subtitle="Built dark-first for long sessions" icon={<Accessibility className="size-4" />} />
              <p className="mb-2 text-xs text-muted-foreground">Text size</p>
              <Choices options={["Default", "Large", "Extra large"]} />
              <div className="mt-4">
                <Toggle label="Reduce motion" description="Removes glow, scanline and transition effects." />
                <Toggle label="High contrast surfaces" />
                <Toggle label="Monospace body text" description="For people who think in terminals." />
                <Toggle label="Always show focus outlines" on />
                <Toggle label="Screen-reader friendly lab transcripts" on />
              </div>
            </Panel>
          ) : null}

          {active === "notifications" ? (
            <Panel>
              <PanelHeader title="Notifications" icon={<Bell className="size-4" />} />
              <Toggle label="Daily drill reminder" on />
              <Toggle label="Streak at risk warning" on />
              <Toggle label="Squad activity" description="Requests, accepted invites and leaderboard changes." on />
              <Toggle label="Achievement unlocks" on />
              <Toggle label="Email digest" description="Delivery starts with the account stage." />
              <Link to="/notifications" className={cn(buttonClass({ variant: "outline", size: "sm" }), "mt-4")}>
                Open notifications
              </Link>
            </Panel>
          ) : null}

          {active === "privacy" ? (
            <Panel>
              <PanelHeader title="Privacy" subtitle="What squad mates and the leaderboard can see" icon={<Eye className="size-4" />} />
              <Toggle label="Show rank and badges" on />
              <Toggle label="Show streaks" on />
              <Toggle label="Show challenge scores on the squad leaderboard" on />
              <Toggle label="Show lab attempt counts" />
              <Toggle label="Allow friend requests by handle search" on />
              <p className="mt-3 text-xs text-muted-foreground">
                Email and account details are never shared with other learners.
              </p>
            </Panel>
          ) : null}

          {active === "security" ? (
            <>
              <Panel>
                <PanelHeader title="Security" icon={<Lock className="size-4" />} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Current password">
                    <Input type="password" placeholder="••••••••" disabled />
                  </Field>
                  <Field label="New password">
                    <Input type="password" placeholder="••••••••" disabled />
                  </Field>
                </div>
                <FutureSurface
                  className="mt-4"
                  title="Password, sessions, permissions and two-factor"
                  description="Password changes, active session management, role permissions and 2FA enrolment activate with the authentication integration. Nothing here is functional yet."
                />
                <div className="mt-4 flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/8 px-3 py-3">
                  <div>
                    <p className="text-sm">Delete account</p>
                    <p className="text-xs text-muted-foreground">
                      Removes your profile and progress permanently — enabled with accounts.
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" disabled className="text-destructive">
                    <Trash2 className="size-3.5" /> Delete
                  </Button>
                </div>
              </Panel>
            </>
          ) : null}

          {active === "safety" ? (
            <Panel>
              <PanelHeader
                title="Terminal & lab safety"
                subtitle="Non-negotiable platform boundaries"
                icon={<ShieldCheck className="size-4" />}
              />
              <ul className="space-y-2 text-sm text-muted-foreground">
                {[
                  "Sandboxed practice environments only",
                  "Authorized learning labs and challenges only",
                  "Defensive security curriculum",
                  "No real-machine or third-party targets",
                  "Destructive commands blocked inside labs",
                ].map((rule) => (
                  <li
                    key={rule}
                    className="flex items-center justify-between gap-3 rounded-lg border border-signal/25 bg-signal/8 px-3 py-2.5"
                  >
                    {rule} <Tag tone="signal">Enforced</Tag>
                  </li>
                ))}
              </ul>
              <div className="mt-4">
                <Toggle label="Confirm before running a reset in a lab" on />
                <Toggle label="Show safety reminder at lab start" on />
              </div>
              <Link to="/terminal" className={cn(buttonClass({ variant: "outline", size: "sm" }), "mt-4")}>
                <SquareTerminal className="size-3.5" /> Open labs
              </Link>
            </Panel>
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}
