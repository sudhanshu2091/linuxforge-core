import { createFileRoute, Link } from "@tanstack/react-router";
import { FolderTree, Play, RotateCcw, ShieldAlert, ShieldCheck, SquareTerminal, BookMarked } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import {
  Button,
  FutureSurface,
  FutureTag,
  PageHeader,
  Panel,
  PanelHeader,
  Tag,
  buttonClass,
} from "@/components/kit/primitives";

export const Route = createFileRoute("/terminal")({
  head: () => ({
    meta: [
      { title: "Practice Terminal — LinuxForge AI" },
      {
        name: "description",
        content:
          "A sandboxed practice terminal surface for Linux drills — restricted scope, no access to real machines.",
      },
      { property: "og:title", content: "Practice Terminal — LinuxForge AI" },
      { property: "og:description", content: "A sandboxed practice terminal surface for Linux drills." },
    ],
  }),
  component: TerminalPage,
});

const tree = [
  { name: "project/", depth: 0 },
  { name: "notes.txt", depth: 1 },
  { name: "scripts/", depth: 1 },
  { name: "deploy.sh", depth: 2 },
  { name: "logs/", depth: 1 },
  { name: "auth.log", depth: 2 },
];

const cheats = [
  { cmd: "ls -l", note: "long listing with permissions" },
  { cmd: "chmod 640 file", note: "owner rw, group r" },
  { cmd: "ps aux", note: "all running processes" },
  { cmd: "grep -i fail auth.log", note: "search case-insensitively" },
];

function TerminalPage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="Practice terminal"
        title="A safe place to type the scary commands"
        description="This workspace is designed for guided drills inside a restricted sandbox. It never connects to real machines and never enables offensive activity."
        actions={
          <>
            <Tag tone="signal">
              <ShieldCheck className="size-3" /> Sandbox only
            </Tag>
            <FutureTag label="Sandbox runtime later" />
          </>
        }
      />

      <div className="mb-6 flex items-start gap-3 rounded-xl border border-warn/30 bg-warn/8 p-4">
        <ShieldAlert className="mt-0.5 size-4 shrink-0 text-warn" />
        <p className="text-xs leading-relaxed text-muted-foreground">
          <span className="font-semibold text-warn">Scope notice.</span> The terminal surface is for learning Linux
          fundamentals and defensive practice only. Real-machine access, network scanning of third parties, and
          offensive tooling are out of scope by design.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[220px_1fr_260px]">
        <Panel>
          <PanelHeader title="Sandbox files" icon={<FolderTree className="size-4" />} />
          <ul className="space-y-1 font-mono text-xs">
            {tree.map((t) => (
              <li
                key={t.name}
                className="rounded-md px-2 py-1.5 text-muted-foreground hover:bg-surface-2 hover:text-foreground"
                style={{ paddingLeft: `${8 + t.depth * 14}px` }}
              >
                {t.name}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[11px] text-muted-foreground">Sample tree for layout only.</p>
        </Panel>

        <Panel padded={false} className="flex min-h-[520px] flex-col overflow-hidden">
          <div className="flex items-center gap-2 border-b border-border bg-surface-2/70 px-4 py-3">
            <SquareTerminal className="size-4 text-primary" />
            <span className="font-mono text-xs text-muted-foreground">forge-sandbox · session inactive</span>
            <div className="ml-auto flex gap-1.5">
              <Button variant="ghost" size="sm" disabled>
                <RotateCcw className="size-3.5" /> Reset
              </Button>
              <Button variant="outline" size="sm" disabled>
                <Play className="size-3.5" /> Start session
              </Button>
            </div>
          </div>
          <div className="scanline flex-1 space-y-1.5 p-5 font-mono text-[13px] leading-relaxed">
            <p className="text-muted-foreground">forge-sandbox v0 — interface preview</p>
            <p className="text-muted-foreground/70">
              A restricted shell attaches here in the sandbox stage. Nothing you type is executed today.
            </p>
            <p className="pt-3 text-muted-foreground">
              <span className="text-signal">learner@forge</span>:<span className="text-accent">~/project</span>${" "}
              <span className="inline-block h-4 w-2 translate-y-0.5 animate-pulse bg-primary/80" />
            </p>
          </div>
          <div className="border-t border-border p-3">
            <input
              disabled
              placeholder="Command input activates with the sandbox runtime"
              className="h-10 w-full cursor-not-allowed rounded-lg border border-input bg-surface/60 px-3 font-mono text-sm placeholder:text-muted-foreground/70"
            />
          </div>
        </Panel>

        <div className="space-y-6">
          <Panel>
            <PanelHeader title="Command cheatsheet" icon={<BookMarked className="size-4" />} />
            <ul className="space-y-2">
              {cheats.map((c) => (
                <li key={c.cmd} className="rounded-lg border border-border bg-surface-2/50 p-2.5">
                  <p className="font-mono text-xs text-primary">{c.cmd}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{c.note}</p>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel>
            <PanelHeader title="Drill objectives" subtitle="Attach a lab to this shell" />
            <FutureSurface
              title="No drill attached"
              description="Selecting a challenge will pin its objectives beside the shell."
            >
              <Link to="/challenges" className={buttonClass({ variant: "outline", size: "sm" })}>
                Browse challenges
              </Link>
            </FutureSurface>
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}
