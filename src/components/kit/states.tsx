import type { ReactNode } from "react";
import { AlertTriangle, Inbox, RotateCcw } from "lucide-react";
import { Button } from "@/components/kit/primitives";
import { cn } from "@/lib/utils";

/** Skeleton rows used while a shared learner/social service resolves. */
export function LoadingBlock({ rows = 3, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("space-y-3", className)} aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-xl border border-border bg-surface/40 p-4">
          <span className="size-10 shrink-0 animate-pulse rounded-xl bg-surface-2" />
          <div className="min-w-0 flex-1 space-y-2">
            <span className="block h-3 w-1/3 animate-pulse rounded bg-surface-2" />
            <span className="block h-3 w-1/2 animate-pulse rounded bg-surface-2/70" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  className,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-dashed border-border-strong bg-surface/40 p-8 text-center",
        className,
      )}
    >
      <span className="mx-auto mb-3 flex size-10 items-center justify-center rounded-xl border border-border bg-surface-2 text-muted-foreground">
        {icon ?? <Inbox className="size-4" />}
      </span>
      <p className="text-sm font-semibold">{title}</p>
      {description ? (
        <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function ErrorState({
  title = "Couldn't load this yet",
  description,
  onRetry,
  className,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn("rounded-xl border border-destructive/35 bg-destructive/8 p-6 text-center", className)}
    >
      <span className="mx-auto mb-3 flex size-10 items-center justify-center rounded-xl border border-destructive/35 bg-destructive/10 text-destructive">
        <AlertTriangle className="size-4" />
      </span>
      <p className="text-sm font-semibold">{title}</p>
      {description ? <p className="mt-1 text-xs text-muted-foreground">{description}</p> : null}
      {onRetry ? (
        <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
          <RotateCcw className="size-3.5" /> Try again
        </Button>
      ) : null}
    </div>
  );
}
