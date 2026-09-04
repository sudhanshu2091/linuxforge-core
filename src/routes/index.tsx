import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  GraduationCap,
  Languages,
  Lock,
  ShieldCheck,
  Sparkles,
  SquareTerminal,
  Swords,
  Trophy,
  Users,
} from "lucide-react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { Button, buttonClass, FutureTag, Panel, ProgressBar, Tag } from "@/components/kit/primitives";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LinuxForge AI — Forge Linux & Security Skills" },
      {
        name: "description",
        content:
          "LinuxForge AI teaches Linux and defensive cybersecurity through guided paths, sandboxed labs, and a senior-mentor AI tutor that speaks English or Hinglish.",
      },
      { property: "og:title", content: "LinuxForge AI — Forge Linux & Security Skills" },
      {
        property: "og:description",
        content: "Guided Linux and defensive security learning with sandboxed labs and a mentor-style AI tutor.",
      },
    ],
  }),
  component: Landing,
});

const features = [
  {
    icon: GraduationCap,
    title: "Paths that build muscle memory",
    body: "Filesystem, permissions, processes, networking, hardening — each unit ends in a drill, not a quiz.",
  },
  {
    icon: Bot,
    title: "A mentor, not a chatbot",
    body: "The tutor explains why a command works, catches your bad habits, and switches to Hinglish when that lands better.",
  },
  {
    icon: SquareTerminal,
    title: "Sandboxed practice surface",
    body: "A terminal workspace built for drills and safe exploration — never a door to real machines.",
  },
  {
    icon: Trophy,
    title: "Game-style progression",
    body: "Ranks, streaks, skill trees and squad leaderboards keep the grind readable and rewarding.",
  },
];

const paths = [
  { name: "Linux Foundations", level: "Recruit", units: 24, pct: 0, tone: "primary" as const },
  { name: "Shell & Scripting", level: "Operator", units: 18, pct: 0, tone: "accent" as const },
  { name: "Networking Essentials", level: "Operator", units: 21, pct: 0, tone: "accent" as const },
  { name: "System Hardening", level: "Specialist", units: 16, pct: 0, tone: "signal" as const },
  { name: "Blue-Team Defence", level: "Specialist", units: 20, pct: 0, tone: "signal" as const },
  { name: "Incident Response", level: "Architect", units: 14, pct: 0, tone: "primary" as const },
];

function Landing() {
  return (
    <div className="min-h-screen">
      <SiteHeader />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 forge-grid opacity-40" />
        <div
          className="absolute -top-40 left-1/2 size-[38rem] -translate-x-1/2 rounded-full opacity-20 blur-3xl"
          style={{ background: "var(--gradient-forge)" }}
        />
        <div className="relative mx-auto grid max-w-7xl gap-14 px-4 py-20 lg:grid-cols-[1.05fr_1fr] lg:px-8 lg:py-28">
          <div>
            <Tag tone="primary">
              <Sparkles className="size-3" />
              Interface preview — stage one
            </Tag>
            <h1 className="mt-6 font-display text-4xl font-semibold leading-[1.05] tracking-tight lg:text-6xl">
              Forge real Linux instincts,
              <span className="forge-gradient-text"> one command at a time.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground lg:text-lg">
              LinuxForge AI turns Linux and defensive cybersecurity into a progression system: structured paths,
              hands-on lab missions, and a senior-engineer tutor sitting beside you the whole way.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/auth/signup" className={buttonClass({ size: "lg" })}>
                Start forging
                <ArrowRight className="size-4" />
              </Link>
              <Link to="/dashboard" className={buttonClass({ variant: "outline", size: "lg" })}>
                Explore the interface
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5 text-signal" /> Desktop-first workspace
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="size-3.5 text-signal" /> Defensive-only curriculum
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Languages className="size-3.5 text-signal" /> English + Hinglish tutoring
              </span>
            </div>
          </div>

          {/* Mock workspace preview */}
          <div className="relative">
            <Panel className="glow-ring overflow-hidden p-0" padded={false}>
              <div className="flex items-center gap-2 border-b border-border bg-surface-2/70 px-4 py-3">
                <span className="size-2.5 rounded-full bg-destructive/70" />
                <span className="size-2.5 rounded-full bg-warn/70" />
                <span className="size-2.5 rounded-full bg-signal/70" />
                <span className="ml-3 font-mono text-xs text-muted-foreground">forge://lab/permissions-01</span>
                <FutureTag className="ml-auto hidden sm:inline-flex" label="Sample view" />
              </div>
              <div className="scanline space-y-2 p-5 font-mono text-[13px] leading-relaxed">
                <p className="text-muted-foreground">
                  <span className="text-signal">learner@forge</span>:<span className="text-accent">~/lab</span>${" "}
                  ls -l notes.txt
                </p>
                <p className="text-foreground">-rw-r--r-- 1 learner learner 812 notes.txt</p>
                <p className="text-muted-foreground">
                  <span className="text-signal">learner@forge</span>:<span className="text-accent">~/lab</span>${" "}
                  chmod 640 notes.txt
                </p>
                <p className="text-signal">✓ drill objective 2 of 3 complete</p>
              </div>
              <div className="border-t border-border bg-surface/70 p-4">
                <div className="flex items-start gap-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                    <Bot className="size-4" />
                  </span>
                  <div>
                    <p className="text-xs font-semibold">Forge Mentor</p>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      "Nice — 640 means owner reads and writes, group only reads. Ab socho: agar group ko bhi write
                      dena ho, kya number banega?"
                    </p>
                  </div>
                </div>
              </div>
            </Panel>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-4 py-20 lg:px-8">
        <div className="max-w-2xl">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary">Why it works</p>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight lg:text-4xl">
            Built like a developer tool, paced like a good game.
          </h2>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {features.map((f) => (
            <Panel key={f.title} className="group transition-colors hover:border-border-strong">
              <span className="flex size-10 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-primary">
                <f.icon className="size-5" />
              </span>
              <h3 className="mt-4 text-base font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
            </Panel>
          ))}
        </div>
      </section>

      {/* Paths */}
      <section id="paths" className="border-y border-border bg-surface/40">
        <div className="mx-auto max-w-7xl px-4 py-20 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-2xl">
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary">Curriculum map</p>
              <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight lg:text-4xl">
                Six tracks, one straight line from nervous to fluent.
              </h2>
            </div>
            <Link to="/learn" className={buttonClass({ variant: "outline" })}>
              Open learning paths
            </Link>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {paths.map((p) => (
              <Panel key={p.name}>
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold">{p.name}</h3>
                  <Tag tone={p.tone}>{p.level}</Tag>
                </div>
                <p className="mt-2 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                  {p.units} units
                </p>
                <ProgressBar className="mt-4" value={p.pct} tone={p.tone === "primary" ? "primary" : p.tone} />
                <p className="mt-2 text-xs text-muted-foreground">Progress appears once learner data is connected.</p>
              </Panel>
            ))}
          </div>
        </div>
      </section>

      {/* Tutor + labs */}
      <section id="tutor" className="mx-auto grid max-w-7xl gap-6 px-4 py-20 lg:grid-cols-2 lg:px-8">
        <Panel className="flex flex-col">
          <Tag tone="primary">
            <Bot className="size-3" /> AI tutor
          </Tag>
          <h2 className="mt-4 font-display text-2xl font-semibold tracking-tight">
            The senior who never sighs at your question.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Ask in English, Hinglish, or a mix. The tutor mirrors your tone, keeps explanations concrete, and points
            to the exact drill that will make the concept stick.
          </p>
          <div className="mt-6 space-y-3">
            <div className="rounded-lg border border-border bg-surface-2/60 p-3 text-sm">
              <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">You</p>
              <p className="mt-1">"sudo aur su me farak kya hai exactly?"</p>
            </div>
            <div className="rounded-lg border border-primary/25 bg-primary/8 p-3 text-sm">
              <p className="font-mono text-[11px] uppercase tracking-widest text-primary">Forge Mentor</p>
              <p className="mt-1 text-muted-foreground">
                "Simple way to hold it: <span className="font-mono text-foreground">su</span> switches you into
                another user's shell, <span className="font-mono text-foreground">sudo</span> borrows power for one
                command. Ek line ka drill kar lo, phir yaad rahega."
              </p>
            </div>
          </div>
          <div className="mt-auto pt-6">
            <Link to="/tutor" className={buttonClass({ variant: "outline", size: "sm" })}>
              Open tutor shell
            </Link>
          </div>
        </Panel>

        <Panel id="labs" className="flex flex-col">
          <Tag tone="signal">
            <Swords className="size-3" /> Lab missions
          </Tag>
          <h2 className="mt-4 font-display text-2xl font-semibold tracking-tight">
            Challenges that grade the reasoning, not the guess.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Each mission gives a scenario, objectives, and hints you can unlock at a cost. Everything runs inside a
            restricted sandbox with a defensive-only scope.
          </p>
          <ul className="mt-6 space-y-2.5 text-sm text-muted-foreground">
            {[
              "Recover a broken permissions setup",
              "Trace a runaway process and free the CPU",
              "Read the logs and spot the failed logins",
              "Harden an SSH config to policy",
            ].map((t) => (
              <li key={t} className="flex items-center gap-2.5 rounded-lg border border-border bg-surface-2/50 px-3 py-2">
                <Lock className="size-3.5 shrink-0 text-muted-foreground" />
                {t}
              </li>
            ))}
          </ul>
          <div className="mt-auto pt-6">
            <Link to="/challenges" className={buttonClass({ variant: "outline", size: "sm" })}>
              Browse challenges
            </Link>
          </div>
        </Panel>
      </section>

      {/* Progression */}
      <section id="progression" className="border-y border-border bg-surface/40">
        <div className="mx-auto max-w-7xl px-4 py-20 lg:px-8">
          <div className="max-w-2xl">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary">Progression</p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight lg:text-4xl">
              Ranks you can feel, not vanity points.
            </h2>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Trophy, label: "Forge ranks", body: "Recruit → Operator → Specialist → Architect." },
              { icon: Sparkles, label: "Skill tree", body: "Unlock branches by proving them in labs." },
              { icon: Users, label: "Squads", body: "Compare streaks with friends, not strangers." },
              { icon: ShieldCheck, label: "Verified drills", body: "Objectives check state, not typing speed." },
            ].map((c) => (
              <Panel key={c.label}>
                <c.icon className="size-5 text-primary" />
                <h3 className="mt-3 text-sm font-semibold">{c.label}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{c.body}</p>
              </Panel>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 forge-grid opacity-30" />
        <div className="relative mx-auto max-w-3xl px-4 py-24 text-center lg:px-8">
          <h2 className="font-display text-3xl font-semibold tracking-tight lg:text-4xl">
            Your first drill is one login away.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">
            This build is the interface foundation — accounts, learner data, tutoring intelligence and the sandboxed
            shell plug in as later stages.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/auth/signup" className={buttonClass({ size: "lg" })}>
              Create your account
            </Link>
            <Link to="/terminal" className={cn(buttonClass({ variant: "outline", size: "lg" }))}>
              See the terminal surface
            </Link>
          </div>
          <div className="mt-6 flex justify-center">
            <Button variant="ghost" size="sm" disabled>
              No live machine access in this build
            </Button>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
