import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <Link
      to="/"
      className={cn("group flex items-center gap-2.5", className)}
      aria-label="LinuxForge AI home"
    >
      <span className="relative flex size-8 items-center justify-center rounded-lg bg-primary font-mono text-sm font-bold text-primary-foreground transition-transform group-hover:scale-105">
        {">"}
        <span className="absolute -bottom-0.5 -right-0.5 size-2 rounded-full bg-signal" />
      </span>
      {!compact && (
        <span className="font-display text-sm font-semibold tracking-tight">
          LinuxForge<span className="text-primary"> AI</span>
        </span>
      )}
    </Link>
  );
}
