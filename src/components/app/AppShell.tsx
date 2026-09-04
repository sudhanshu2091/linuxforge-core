import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Bell, Flame, Menu, Search, Sparkles, X, LogOut } from "lucide-react";
import { Logo } from "@/components/kit/Logo";
import { FutureTag, Tag, buttonClass } from "@/components/kit/primitives";
import { navGroups } from "./nav-config";
import { cn } from "@/lib/utils";

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="space-y-6">
      {navGroups.map((group) => (
        <div key={group.title}>
          <p className="mb-2 px-3 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            {group.title}
          </p>
          <ul className="space-y-1">
            {group.items.map((item) => (
              <li key={item.to}>
                <Link
                  to={item.to}
                  onClick={onNavigate}
                  className="group flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-surface hover:text-foreground data-[status=active]:bg-primary/10 data-[status=active]:text-primary"
                  activeProps={{ className: "font-medium" }}
                >
                  <item.icon className="size-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar — desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border bg-surface/50 backdrop-blur-md lg:flex">
        <div className="flex h-16 items-center border-b border-border px-5">
          <Logo />
        </div>
        <div className="flex-1 overflow-y-auto px-2 py-5">
          <NavList />
        </div>
        <div className="border-t border-border p-4">
          <div className="rounded-lg border border-border bg-surface-2/70 p-3">
            <div className="flex items-center gap-2">
              <Flame className="size-4 text-primary" />
              <p className="text-xs font-semibold">Forge streak</p>
            </div>
            <p className="mt-1 font-mono text-lg font-semibold">— days</p>
            <FutureTag className="mt-2" label="Learner data later" />
          </div>
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-72 flex-col border-r border-border bg-surface">
            <div className="flex h-16 items-center justify-between border-b border-border px-4">
              <Logo />
              <button
                aria-label="Close navigation"
                onClick={() => setMobileOpen(false)}
                className="rounded-md p-2 text-muted-foreground hover:bg-surface-2"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-2 py-5">
              <NavList onNavigate={() => setMobileOpen(false)} />
            </div>
          </div>
        </div>
      )}

      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur-md lg:px-8">
          <button
            aria-label="Open navigation"
            onClick={() => setMobileOpen(true)}
            className="rounded-md p-2 text-muted-foreground hover:bg-surface lg:hidden"
          >
            <Menu className="size-5" />
          </button>
          <div className="relative hidden max-w-sm flex-1 md:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              disabled
              placeholder="Search lessons, commands, challenges…"
              className="h-9 w-full cursor-not-allowed rounded-lg border border-input bg-surface/60 pl-9 pr-3 text-sm placeholder:text-muted-foreground/70"
            />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Tag tone="signal" className="hidden sm:inline-flex">
              Sandbox only
            </Tag>
            <Link to="/tutor" className={cn(buttonClass({ variant: "outline", size: "sm" }), "hidden sm:inline-flex")}>
              <Sparkles className="size-3.5 text-primary" />
              Ask tutor
            </Link>
            <button
              aria-label="Notifications"
              className="relative rounded-lg border border-border bg-surface/60 p-2 text-muted-foreground hover:text-foreground"
            >
              <Bell className="size-4" />
              <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-primary" />
            </button>
            <Link
              to="/profile"
              className="flex items-center gap-2 rounded-lg border border-border bg-surface/60 py-1 pl-1 pr-3 text-sm hover:bg-surface-2"
            >
              <span className="flex size-7 items-center justify-center rounded-md bg-surface-2 font-mono text-xs text-primary">
                LF
              </span>
              <span className="hidden font-medium sm:inline">Guest</span>
            </Link>
            <Link
              to="/auth/login"
              aria-label="Sign out placeholder"
              className="rounded-lg border border-border bg-surface/60 p-2 text-muted-foreground hover:text-foreground"
            >
              <LogOut className="size-4" />
            </Link>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl px-4 py-8 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
