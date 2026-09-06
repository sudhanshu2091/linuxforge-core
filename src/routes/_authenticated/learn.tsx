import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, CheckCircle2, ChevronRight, Circle, Lock, PlayCircle, Bot } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import {
  FutureSurface,
  FutureTag,
  PageHeader,
  Panel,
  PanelHeader,
  ProgressBar,
  Tag,
  buttonClass,
} from "@/components/kit/primitives";

export const Route = createFileRoute("/learn")({
  head: () => ({
    meta: [
      { title: "Learning Paths — LinuxForge AI" },
      {
        name: "description",
        content: "Structured Linux and defensive security learning paths, from filesystem basics to system hardening.",
      },
      { property: "og:title", content: "Learning Paths — LinuxForge AI" },
      { property: "og:description", content: "Structured Linux and defensive security learning paths." },
    ],
  }),
  component: LearnPage,
});

const tracks = [
  { name: "Linux Foundations", level: "Recruit", units: 24 },
  { name: "Shell & Scripting", level: "Operator", units: 18 },
  { name: "Networking Essentials", level: "Operator", units: 21 },
  { name: "System Hardening", level: "Specialist", units: 16 },
  { name: "Blue-Team Defence", level: "Specialist", units: 20 },
  { name: "Incident Response", level: "Architect", units: 14 },
];

const units = [
  { name: "What the filesystem really is", state: "done" },
  { name: "Moving around: cd, ls, pwd", state: "done" },
  { name: "Reading files without fear", state: "current" },
  { name: "File permissions, numerically", state: "locked" },
  { name: "Ownership and groups", state: "locked" },
  { name: "Drill: repair a broken directory", state: "locked" },
];

function StateIcon({ state }: { state: string }) {
  if (state === "done") return <CheckCircle2 className="size-4 text-signal" />;
  if (state === "current") return <PlayCircle className="size-4 text-primary" />;
  return <Lock className="size-4 text-muted-foreground" />;
}

function LearnPage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="Learning paths"
        title="Pick a track, forge it unit by unit"
        description="Every unit pairs a short concept read with a hands-on drill. Nothing unlocks by scrolling — you prove it in the sandbox."
        actions={<Tag tone="signal">Defensive curriculum only</Tag>}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {tracks.map((t, i) => (
          <Panel key={t.name} className="transition-colors hover:border-border-strong">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold">{t.name}</h3>
                <p className="mt-1 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                  {t.units} units
                </p>
              </div>
              <Tag tone={i % 3 === 0 ? "primary" : i % 3 === 1 ? "accent" : "signal"}>{t.level}</Tag>
            </div>
            <ProgressBar className="mt-4" value={0} tone={i % 2 === 0 ? "primary" : "accent"} />
            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Not started</span>
              <span className={buttonClass({ variant: "ghost", size: "sm" })}>
                Open <ChevronRight className="size-3.5" />
              </span>
            </div>
          </Panel>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Panel>
          <PanelHeader
            title="Linux Foundations — unit list"
            subtitle="Sample structure for the active track"
            icon={<BookOpen className="size-4" />}
            action={<FutureTag label="Content later" />}
          />
          <ul className="divide-y divide-border">
            {units.map((u) => (
              <li key={u.name} className="flex items-center gap-3 py-3">
                <StateIcon state={u.state} />
                <span className={u.state === "locked" ? "text-sm text-muted-foreground" : "text-sm"}>{u.name}</span>
                {u.state === "current" && <Tag tone="primary" className="ml-auto">Current</Tag>}
              </li>
            ))}
          </ul>
        </Panel>

        <div className="space-y-6">
          <Panel>
            <PanelHeader title="Unit preview" subtitle="Concept · Drill · Explain-back" icon={<Circle className="size-4" />} />
            <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
              <p>
                Each unit opens with a short, plain-language explanation, then drops you straight into a drill with
                verifiable objectives. Finally the mentor asks you to explain it back in your own words.
              </p>
              <div className="rounded-lg border border-border bg-surface-2/50 p-3 font-mono text-xs">
                <p className="text-muted-foreground"># objective</p>
                <p className="text-foreground">make notes.txt readable by group, not the world</p>
              </div>
            </div>
            <Link to="/terminal" className={buttonClass({ variant: "outline", size: "sm" }) + " mt-4 w-full"}>
              Open practice sandbox
            </Link>
          </Panel>

          <Panel>
            <PanelHeader title="Stuck on a unit?" icon={<Bot className="size-4" />} />
            <p className="text-sm leading-relaxed text-muted-foreground">
              Your mentor can re-teach any unit at a slower pace, in English or Hinglish.
            </p>
            <Link to="/tutor" className={buttonClass({ size: "sm" }) + " mt-4 w-full"}>
              Ask the tutor
            </Link>
          </Panel>

          <FutureSurface
            title="Adaptive sequencing"
            description="Unit ordering will adapt to your drill results once learner data is connected."
          />
        </div>
      </div>
    </AppShell>
  );
}
