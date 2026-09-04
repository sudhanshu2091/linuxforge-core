import type { ReactNode, ButtonHTMLAttributes, InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/* ---------- Panel ---------- */

export function Panel({
  className,
  children,
  padded = true,
}: {
  className?: string;
  children: ReactNode;
  padded?: boolean;
}) {
  return (
    <section
      className={cn(
        "rounded-xl border border-border bg-card/80 panel-shadow backdrop-blur-sm",
        padded && "p-5",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function PanelHeader({
  title,
  subtitle,
  icon,
  action,
  className,
}: {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-4 flex items-start justify-between gap-4", className)}>
      <div className="flex items-start gap-3">
        {icon ? (
          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-2 text-primary">
            {icon}
          </span>
        ) : null}
        <div>
          <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
          {subtitle ? <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p> : null}
        </div>
      </div>
      {action}
    </div>
  );
}

/* ---------- Button ---------- */

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "forge" | "outline" | "ghost" | "subtle";
  size?: "sm" | "md" | "lg";
};

const btnBase =
  "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50";

export function buttonClass({ variant = "forge", size = "md" }: Omit<BtnProps, "children"> = {}) {
  return cn(
    btnBase,
    size === "sm" && "h-8 px-3 text-xs",
    size === "md" && "h-10 px-4 text-sm",
    size === "lg" && "h-12 px-6 text-base",
    variant === "forge" &&
      "bg-primary text-primary-foreground hover:brightness-110 hover:shadow-[0_10px_30px_-12px_var(--primary)]",
    variant === "outline" && "border border-border-strong bg-surface/60 text-foreground hover:bg-surface-2",
    variant === "subtle" && "bg-secondary text-secondary-foreground hover:bg-surface-2",
    variant === "ghost" && "text-muted-foreground hover:bg-surface hover:text-foreground",
  );
}

export function Button({ variant, size, className, ...props }: BtnProps) {
  return <button className={cn(buttonClass({ variant, size }), className)} {...props} />;
}

/* ---------- Badges ---------- */

export function Tag({
  children,
  tone = "muted",
  className,
}: {
  children: ReactNode;
  tone?: "muted" | "primary" | "signal" | "accent" | "warn";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 font-mono text-[11px] uppercase tracking-wider",
        tone === "muted" && "border-border bg-surface-2 text-muted-foreground",
        tone === "primary" && "border-primary/35 bg-primary/10 text-primary",
        tone === "signal" && "border-signal/35 bg-signal/10 text-signal",
        tone === "accent" && "border-accent/35 bg-accent/10 text-accent",
        tone === "warn" && "border-warn/35 bg-warn/10 text-warn",
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Marks a surface whose data or behaviour arrives in a later integration stage. */
export function FutureTag({ label = "Connects later", className }: { label?: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border border-dashed border-accent/45 bg-accent/8 px-2 py-0.5 font-mono text-[11px] uppercase tracking-wider text-accent",
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-accent" />
      {label}
    </span>
  );
}

/** Dashed placeholder region for a future integration surface. */
export function FutureSurface({
  title,
  description,
  icon,
  className,
  children,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-dashed border-border-strong bg-surface/40 p-6 text-center",
        className,
      )}
    >
      {icon ? (
        <span className="mx-auto mb-3 flex size-10 items-center justify-center rounded-xl border border-border bg-surface-2 text-accent">
          {icon}
        </span>
      ) : null}
      <p className="text-sm font-semibold">{title}</p>
      {description ? (
        <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-muted-foreground">{description}</p>
      ) : null}
      {children ? <div className="mt-4">{children}</div> : null}
    </div>
  );
}

/* ---------- Progress ---------- */

export function ProgressBar({
  value,
  tone = "primary",
  className,
}: {
  value: number;
  tone?: "primary" | "signal" | "accent";
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div
      className={cn("h-2 w-full overflow-hidden rounded-full bg-surface-2", className)}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-500",
          tone === "primary" && "bg-primary",
          tone === "signal" && "bg-signal",
          tone === "accent" && "bg-accent",
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/* ---------- Stat ---------- */

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "primary",
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: ReactNode;
  tone?: "primary" | "signal" | "accent" | "warn";
}) {
  return (
    <Panel className="relative overflow-hidden">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">{label}</p>
          <p className="mt-2 font-display text-2xl font-semibold">{value}</p>
          {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
        </div>
        {icon ? (
          <span
            className={cn(
              "flex size-9 items-center justify-center rounded-lg border",
              tone === "primary" && "border-primary/30 bg-primary/10 text-primary",
              tone === "signal" && "border-signal/30 bg-signal/10 text-signal",
              tone === "accent" && "border-accent/30 bg-accent/10 text-accent",
              tone === "warn" && "border-warn/30 bg-warn/10 text-warn",
            )}
          >
            {icon}
          </span>
        ) : null}
      </div>
    </Panel>
  );
}

/* ---------- Form fields ---------- */

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-[11px] text-muted-foreground">{hint}</span> : null}
    </label>
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-lg border border-input bg-surface/70 px-3 text-sm text-foreground placeholder:text-muted-foreground/70 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-ring/30",
        className,
      )}
      {...props}
    />
  );
}

/* ---------- Page header ---------- */

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-col gap-4 border-b border-border pb-6 lg:flex-row lg:items-end lg:justify-between">
      <div>
        {eyebrow ? (
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary">{eyebrow}</p>
        ) : null}
        <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight lg:text-3xl">{title}</h1>
        {description ? (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}
