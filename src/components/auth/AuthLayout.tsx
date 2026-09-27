import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, ShieldCheck, Terminal, Sparkles } from "lucide-react";
import { Logo } from "@/components/kit/Logo";
import { FutureTag, Tag } from "@/components/kit/primitives";

const highlights = [
  { icon: Terminal, text: "Guided Linux drills in a safe sandbox" },
  { icon: Sparkles, text: "A mentor that explains in English or Hinglish" },
  { icon: ShieldCheck, text: "Defensive security only — no offensive tooling" },
];

export function AuthLayout({
  eyebrow,
  title,
  description,
  children,
  footer,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      {/* Brand side */}
      <div className="relative hidden flex-col justify-between overflow-hidden border-r border-border bg-surface/50 p-10 lg:flex">
        <div className="absolute inset-0 forge-grid opacity-40" />
        <div
          className="absolute -left-32 top-1/3 size-96 rounded-full opacity-25 blur-3xl"
          style={{ background: "var(--gradient-forge)" }}
        />
        <div className="relative">
          <Logo />
        </div>
        <div className="relative max-w-md">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary">
            Forge your fundamentals
          </p>
          <h2 className="mt-3 font-display text-3xl font-semibold leading-tight">
            The terminal stops being scary once someone sits beside you.
          </h2>
          <ul className="mt-8 space-y-3">
            {highlights.map((h) => (
              <li key={h.text} className="flex items-center gap-3 text-sm text-muted-foreground">
                <span className="flex size-8 items-center justify-center rounded-lg border border-border bg-surface-2 text-primary">
                  <h.icon className="size-4" />
                </span>
                {h.text}
              </li>
            ))}
          </ul>
        </div>
        <div className="relative">
          <Tag tone="signal">Accounts arrive in a later stage</Tag>
        </div>
      </div>

      {/* Form side */}
      <div className="flex flex-col px-5 py-8 lg:px-14 lg:py-12">
        <div className="flex items-center justify-between">
          <div className="lg:hidden">
            <Logo />
          </div>
          <Link
            to="/"
            className="ml-auto inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            Back to site
          </Link>
        </div>

        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary">{eyebrow}</p>
          <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
          <FutureTag className="mt-4 self-start" label="Sign-in wiring later" />
          <div className="mt-7">{children}</div>
          {footer ? <div className="mt-6 text-sm text-muted-foreground">{footer}</div> : null}
        </div>
      </div>
    </div>
  );
}
