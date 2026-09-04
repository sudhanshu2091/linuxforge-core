import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Bell, Languages, Lock, Palette, ShieldCheck, Trash2, UserRound } from "lucide-react";
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
} from "@/components/kit/primitives";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — LinuxForge AI" },
      {
        name: "description",
        content: "Manage your LinuxForge AI profile, tutor language, notifications, appearance and safety scope.",
      },
      { property: "og:title", content: "Settings — LinuxForge AI" },
      { property: "og:description", content: "Manage profile, tutor language, notifications and safety scope." },
    ],
  }),
  component: SettingsPage,
});

const sections = [
  { id: "account", label: "Account", icon: UserRound },
  { id: "tutor", label: "Tutor & language", icon: Languages },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "safety", label: "Safety & scope", icon: ShieldCheck },
];

function Toggle({ label, description, on = false }: { label: string; description?: string; on?: boolean }) {
  const [checked, setChecked] = useState(on);
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border py-3.5 last:border-0">
      <div>
        <p className="text-sm">{label}</p>
        {description ? <p className="mt-0.5 text-xs text-muted-foreground">{description}</p> : null}
      </div>
      <button
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => setChecked((v) => !v)}
        className={cn(
          "mt-0.5 h-5 w-9 shrink-0 rounded-full border transition-colors",
          checked ? "border-primary/50 bg-primary/80" : "border-border bg-surface-2",
        )}
      >
        <span
          className={cn(
            "block size-3.5 rounded-full bg-background transition-transform",
            checked ? "translate-x-4.5 ml-0.5" : "ml-0.5",
          )}
        />
      </button>
    </div>
  );
}

function SettingsPage() {
  const [active, setActive] = useState("account");
  const [lang, setLang] = useState(2);

  return (
    <AppShell>
      <PageHeader
        eyebrow="Settings"
        title="Tune the forge to how you learn"
        description="Preferences are laid out here now; saving them arrives with the account and learner-data stages."
        actions={<FutureTag label="Saving later" />}
      />

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <nav className="lg:sticky lg:top-24 lg:self-start">
          <ul className="flex gap-1 overflow-x-auto lg:flex-col">
            {sections.map((s) => (
              <li key={s.id} className="shrink-0">
                <button
                  onClick={() => setActive(s.id)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                    active === s.id
                      ? "bg-primary/10 font-medium text-primary"
                      : "text-muted-foreground hover:bg-surface hover:text-foreground",
                  )}
                >
                  <s.icon className="size-4" />
                  {s.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="space-y-6">
          <Panel>
            <PanelHeader title="Profile" subtitle="How you appear in the forge" icon={<UserRound className="size-4" />} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Display name">
                <Input placeholder="Guest learner" />
              </Field>
              <Field label="Forge handle">
                <Input placeholder="forge_handle" />
              </Field>
              <Field label="Email">
                <Input type="email" placeholder="you@example.com" />
              </Field>
              <Field label="Location">
                <Input placeholder="City, country" />
              </Field>
            </div>
            <Button size="sm" className="mt-4" disabled>
              Save changes
            </Button>
          </Panel>

          <Panel>
            <PanelHeader
              title="Tutor & language"
              subtitle="Hinglish is a first-class option, not a translation toggle"
              icon={<Languages className="size-4" />}
            />
            <div className="grid gap-2 sm:grid-cols-3">
              {["English", "Hinglish", "Mix (auto)"].map((l, i) => (
                <button
                  key={l}
                  onClick={() => setLang(i)}
                  className={cn(
                    "rounded-lg border px-3 py-2.5 text-sm transition-colors",
                    lang === i
                      ? "border-accent/45 bg-accent/10 text-accent"
                      : "border-border bg-surface/60 text-muted-foreground hover:text-foreground",
                  )}
                >
                  {l}
                </button>
              ))}
            </div>
            <div className="mt-4">
              <Toggle label="Keep technical terms in English" description="chmod stays chmod, explanation stays natural." on />
              <Toggle label="Suggest a drill after every explanation" on />
              <Toggle label="Nudge me when I repeat a mistake" />
            </div>
          </Panel>

          <Panel>
            <PanelHeader title="Notifications" icon={<Bell className="size-4" />} />
            <Toggle label="Daily drill reminder" on />
            <Toggle label="Streak at risk warning" on />
            <Toggle label="Squad activity" />
            <Toggle label="Product updates" />
          </Panel>

          <Panel>
            <PanelHeader title="Appearance" subtitle="Built dark-first for long sessions" icon={<Palette className="size-4" />} />
            <div className="grid gap-2 sm:grid-cols-3">
              {["Forge dark", "Midnight", "High contrast"].map((t, i) => (
                <div
                  key={t}
                  className={cn(
                    "rounded-lg border px-3 py-2.5 text-sm",
                    i === 0 ? "border-primary/45 bg-primary/10 text-primary" : "border-border bg-surface/60 text-muted-foreground",
                  )}
                >
                  {t}
                  {i !== 0 && <span className="ml-2 font-mono text-[10px] uppercase tracking-widest">Soon</span>}
                </div>
              ))}
            </div>
            <Toggle label="Monospace body text" description="For people who think in terminals." />
          </Panel>

          <Panel>
            <PanelHeader title="Safety & scope" subtitle="Non-negotiable platform boundaries" icon={<ShieldCheck className="size-4" />} />
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center justify-between rounded-lg border border-signal/25 bg-signal/8 px-3 py-2.5">
                Sandboxed practice only <Tag tone="signal">Enforced</Tag>
              </li>
              <li className="flex items-center justify-between rounded-lg border border-signal/25 bg-signal/8 px-3 py-2.5">
                Defensive security curriculum <Tag tone="signal">Enforced</Tag>
              </li>
              <li className="flex items-center justify-between rounded-lg border border-signal/25 bg-signal/8 px-3 py-2.5">
                No real-machine or third-party targets <Tag tone="signal">Enforced</Tag>
              </li>
            </ul>
          </Panel>

          <Panel>
            <PanelHeader title="Security" icon={<Lock className="size-4" />} />
            <FutureSurface
              title="Password & sessions"
              description="Password changes, active sessions and two-factor setup arrive with the account stage."
            />
            <div className="mt-4 flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/8 px-3 py-3">
              <div>
                <p className="text-sm">Delete account</p>
                <p className="text-xs text-muted-foreground">Removes your profile and progress permanently.</p>
              </div>
              <Button variant="ghost" size="sm" disabled className="text-destructive">
                <Trash2 className="size-3.5" /> Delete
              </Button>
            </div>
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}
