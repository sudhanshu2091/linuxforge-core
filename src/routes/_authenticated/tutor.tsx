import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Bot, Languages, Send, Gauge, Heart } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { PageHeader, Panel, PanelHeader, Tag } from "@/components/kit/primitives";
import { cn } from "@/lib/utils";
import { askTutor } from "@/lib/ai/tutor.functions";

export const Route = createFileRoute("/_authenticated/tutor")({ component: TutorPage });
const languages = ["English", "Hinglish", "Mix (auto)"];
const depths = ["Explain simply", "Balanced", "Go deep"];

type Message = { role: "mentor" | "you"; text: string };

function TutorPage() {
  const [lang, setLang] = useState(2);
  const [depth, setDepth] = useState(1);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async (text = message) => {
    const value = text.trim();
    if (!value || sending) return;
    setMessage("");
    setError(null);
    setMessages((m) => [...m, { role: "you", text: value }]);
    setSending(true);
    try {
      const res = await askTutor({
        data: { message: value, language: languages[lang]!, depth: depths[depth]! },
      });
      setMessages((m) => [...m, { role: "mentor", text: res.reply }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Tutor is unavailable.");
    } finally {
      setSending(false);
    }
  };

  return (
    <AppShell>
      <PageHeader
        eyebrow="AI tutor"
        title="Forge Mentor"
        description="A live tutor connected to the LinuxForge AI layer. No demo conversation is shown."
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Panel padded={false} className="flex min-h-[560px] flex-col overflow-hidden">
          <div className="flex items-center gap-3 border-b border-border bg-surface-2/60 px-5 py-4">
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Bot className="size-5" />
            </span>
            <div>
              <p className="text-sm font-semibold">Forge Mentor</p>
              <p className="text-xs text-muted-foreground">
                Live AI · Linux & defensive cybersecurity
              </p>
            </div>
            <Tag tone="accent" className="ml-auto">
              <Languages className="size-3" /> {languages[lang]}
            </Tag>
          </div>
          <div className="flex-1 space-y-4 overflow-y-auto p-5">
            {messages.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Ask a real question. Your message will be sent to the configured AI tutor.
              </p>
            )}
            {messages.map((m, i) => (
              <div key={i} className={cn("flex gap-3", m.role === "you" && "justify-end")}>
                <div className="max-w-[85%] rounded-xl border border-border bg-surface-2/70 px-4 py-3 text-sm leading-relaxed">
                  {m.text}
                </div>
              </div>
            ))}
            {sending && <p className="text-xs text-muted-foreground">Thinking…</p>}
            {error && (
              <p className="rounded-lg border border-destructive/30 p-3 text-xs text-destructive">
                {error}
              </p>
            )}
          </div>
          <div className="border-t border-border p-4">
            <div className="flex items-end gap-2 rounded-xl border border-input bg-surface/70 p-2">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void send();
                  }
                }}
                rows={2}
                placeholder="Ask anything — English, Hinglish, ya dono mila ke…"
                className="flex-1 resize-none bg-transparent py-1.5 text-sm outline-none placeholder:text-muted-foreground/70"
              />
              <button
                disabled={sending || !message.trim()}
                onClick={() => void send()}
                className="rounded-lg p-2 text-primary disabled:opacity-40"
                aria-label="Send"
              >
                <Send className="size-4" />
              </button>
            </div>
          </div>
        </Panel>
        <div className="space-y-6">
          <Panel>
            <PanelHeader title="Language" icon={<Languages className="size-4" />} />
            <div className="space-y-2">
              {languages.map((l, i) => (
                <button
                  key={l}
                  onClick={() => setLang(i)}
                  className={cn(
                    "w-full rounded-lg border px-3 py-2.5 text-left text-sm",
                    lang === i
                      ? "border-accent/45 bg-accent/10 text-accent"
                      : "border-border text-muted-foreground",
                  )}
                >
                  {l}
                </button>
              ))}
            </div>
          </Panel>
          <Panel>
            <PanelHeader title="Explanation depth" icon={<Gauge className="size-4" />} />
            <div className="grid grid-cols-3 gap-1">
              {depths.map((d, i) => (
                <button
                  key={d}
                  onClick={() => setDepth(i)}
                  className={cn(
                    "rounded-md px-2 py-2 text-[11px]",
                    depth === i ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                  )}
                >
                  {d}
                </button>
              ))}
            </div>
          </Panel>
          <Panel>
            <PanelHeader title="Mentor style" icon={<Heart className="size-4" />} />
            <p className="text-xs leading-relaxed text-muted-foreground">
              Answers the question first, uses your actual context, explains mistakes, and suggests
              practical drills.
            </p>
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}
