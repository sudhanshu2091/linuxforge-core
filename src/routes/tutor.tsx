import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Bot, Languages, Mic, Paperclip, Send, Sparkles, Gauge, Heart } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import {
  FutureSurface,
  FutureTag,
  PageHeader,
  Panel,
  PanelHeader,
  Tag,
  buttonClass,
} from "@/components/kit/primitives";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/tutor")({
  head: () => ({
    meta: [
      { title: "AI Tutor — LinuxForge AI" },
      {
        name: "description",
        content:
          "A senior-mentor style AI tutor for Linux and security questions, with English, Hinglish and mixed language controls.",
      },
      { property: "og:title", content: "AI Tutor — LinuxForge AI" },
      { property: "og:description", content: "A senior-mentor style tutor for Linux and security questions." },
    ],
  }),
  component: TutorPage,
});

const languages = ["English", "Hinglish", "Mix (auto)"];
const depths = ["Explain simply", "Balanced", "Go deep"];

const conversation = [
  {
    role: "mentor" as const,
    text: "Hey! Bataao, aaj kis cheez pe atke ho? Command, concept, ya lab — jo bhi ho, saath dekh lenge.",
  },
  { role: "you" as const, text: "chmod ke numbers samajh nahi aate. 755 kahan se aata hai?" },
  {
    role: "mentor" as const,
    text: "Perfect question. Teen slots hote hain — owner, group, others. Har slot me read=4, write=2, execute=1. So 755 = owner ko 4+2+1, group ko 4+1, others ko 4+1. Ek chhota drill kar lo, phir permanently baith jayega.",
  },
];

const prompts = [
  "Explain permissions like I'm new",
  "Why is my script not executable?",
  "Hinglish me networking basics samjhao",
  "Give me a drill for processes",
];

function TutorPage() {
  const [lang, setLang] = useState(2);
  const [depth, setDepth] = useState(1);

  return (
    <AppShell>
      <PageHeader
        eyebrow="AI tutor"
        title="Forge Mentor"
        description="A patient senior engineer: concrete answers, no jargon walls, and a drill suggestion whenever a concept needs to become muscle memory."
        actions={<FutureTag label="Tutoring intelligence later" />}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Panel padded={false} className="flex min-h-[560px] flex-col overflow-hidden">
          <div className="flex items-center gap-3 border-b border-border bg-surface-2/60 px-5 py-4">
            <span className="relative flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Bot className="size-5" />
              <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-card bg-signal" />
            </span>
            <div>
              <p className="text-sm font-semibold">Forge Mentor</p>
              <p className="text-xs text-muted-foreground">Senior Linux &amp; blue-team engineer · speaks your mix</p>
            </div>
            <Tag tone="accent" className="ml-auto hidden sm:inline-flex">
              <Languages className="size-3" /> {languages[lang]}
            </Tag>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto p-5">
            {conversation.map((m, i) => (
              <div key={i} className={cn("flex gap-3", m.role === "you" && "justify-end")}>
                {m.role === "mentor" && (
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                    <Bot className="size-4" />
                  </span>
                )}
                <div
                  className={cn(
                    "max-w-[80%] rounded-xl border px-4 py-3 text-sm leading-relaxed",
                    m.role === "mentor"
                      ? "border-primary/20 bg-primary/8 text-muted-foreground"
                      : "border-border bg-surface-2/70",
                  )}
                >
                  {m.text}
                </div>
              </div>
            ))}
            <p className="pt-2 text-center text-[11px] text-muted-foreground">
              Sample conversation — no live model is connected in this build.
            </p>
          </div>

          <div className="border-t border-border p-4">
            <div className="mb-3 flex flex-wrap gap-2">
              {prompts.map((p) => (
                <button
                  key={p}
                  className="rounded-full border border-border bg-surface/60 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  {p}
                </button>
              ))}
            </div>
            <div className="flex items-end gap-2 rounded-xl border border-input bg-surface/70 p-2">
              <button className="rounded-lg p-2 text-muted-foreground hover:text-foreground" aria-label="Attach">
                <Paperclip className="size-4" />
              </button>
              <textarea
                rows={2}
                placeholder="Ask anything — English, Hinglish, ya dono mila ke…"
                className="flex-1 resize-none bg-transparent py-1.5 text-sm outline-none placeholder:text-muted-foreground/70"
              />
              <button className="rounded-lg p-2 text-muted-foreground hover:text-foreground" aria-label="Voice">
                <Mic className="size-4" />
              </button>
              <button disabled className={buttonClass({ size: "sm" })} aria-label="Send">
                <Send className="size-3.5" />
              </button>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Sending is inactive here. The mentor keeps guidance defensive and sandbox-safe.
            </p>
          </div>
        </Panel>

        <div className="space-y-6">
          <Panel>
            <PanelHeader title="Language" subtitle="How should the mentor talk?" icon={<Languages className="size-4" />} />
            <div className="space-y-2">
              {languages.map((l, i) => (
                <button
                  key={l}
                  onClick={() => setLang(i)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-sm transition-colors",
                    lang === i
                      ? "border-accent/45 bg-accent/10 text-accent"
                      : "border-border bg-surface/60 text-muted-foreground hover:text-foreground",
                  )}
                >
                  {l}
                  {lang === i && <span className="font-mono text-[10px] uppercase tracking-widest">Active</span>}
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              Hinglish keeps technical terms in English and the explanation in natural Hindi — the way a colleague
              would actually say it.
            </p>
          </Panel>

          <Panel>
            <PanelHeader title="Explanation depth" icon={<Gauge className="size-4" />} />
            <div className="grid grid-cols-3 gap-1 rounded-lg border border-border bg-surface/60 p-1">
              {depths.map((d, i) => (
                <button
                  key={d}
                  onClick={() => setDepth(i)}
                  className={cn(
                    "rounded-md px-2 py-2 text-[11px] transition-colors",
                    depth === i ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {d}
                </button>
              ))}
            </div>
          </Panel>

          <Panel>
            <PanelHeader title="Mentor style" icon={<Heart className="size-4" />} />
            <ul className="space-y-2 text-xs leading-relaxed text-muted-foreground">
              <li>· Answers the question first, theory second</li>
              <li>· Uses your words back to you</li>
              <li>· Suggests a drill instead of a lecture</li>
              <li>· Never shames a basic question</li>
            </ul>
          </Panel>

          <FutureSurface
            icon={<Sparkles className="size-5" />}
            title="Context-aware tutoring"
            description="Lesson context, drill results and memory of past sessions plug in with the tutoring stage."
          />
        </div>
      </div>
    </AppShell>
  );
}
