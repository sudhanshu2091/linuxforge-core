import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Bell, ChevronDown, Flame, Menu, Search, Sparkles, X, LogOut } from "lucide-react";
import { Logo } from "@/components/kit/Logo";
import { FutureTag, Tag, buttonClass } from "@/components/kit/primitives";
import { primaryNav, userMenuNav } from "./nav-config";
import { demoLearner } from "@/lib/learner-data";
import { handleFrom, initialsFrom, useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

/** Live identity for the account menu, with a safe fallback while it loads. */
function useIdentity() {
  const { profile, user, status } = useAuth();
  const displayName = profile?.display_name ?? user?.email?.split("@")[0] ?? "Learner";
  return {
    status,
    displayName,
    handle: handleFrom(profile ?? null, user?.email),
    initials: initialsFrom(displayName),
  };
}

function useSignOut() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  return async () => {
    await signOut();
    void navigate({ to: "/auth/login", replace: true });
  };
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="space-y-6">
      <div>
        <p className="mb-2 px-3 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Forge</p>
        <ul className="space-y-1">
          {primaryNav.map((item) => (
            <li key={item.to}>
              <Link
                to={item.to}
                onClick={onNavigate}
                className="group flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[status=active]:bg-primary/10 data-[status=active]:text-primary"
                activeProps={{ className: "font-medium" }}
              >
                <item.icon className="size-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <p className="mb-2 px-3 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Account</p>
        <ul className="space-y-1">
          {userMenuNav.map((item) => (
            <li key={item.label}>
              <Link
                to={item.to}
                onClick={onNavigate}
                className="group flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <item.icon className="size-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}

function UserMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const identity = useIdentity();
  const signOut = useSignOut();

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-lg border border-border bg-surface/60 py-1 pl-1 pr-2 text-sm transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="flex size-7 items-center justify-center rounded-md bg-surface-2 font-mono text-xs text-primary">
          {identity.initials}
        </span>
        <span className="hidden max-w-28 truncate font-medium sm:inline">{identity.displayName}</span>
        <ChevronDown className={cn("size-3.5 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-40 mt-2 w-64 overflow-hidden rounded-xl border border-border bg-card/95 panel-shadow backdrop-blur-md"
        >
          <div className="border-b border-border px-4 py-3">
            <p className="truncate text-sm font-semibold">{identity.displayName}</p>
            <p className="truncate font-mono text-[11px] text-muted-foreground">@{identity.handle}</p>
            <div className="mt-2 flex items-center gap-2">
              <Tag tone="primary">{demoLearner.rank}</Tag>
              <span className="font-mono text-[11px] text-muted-foreground">Lv {demoLearner.level}</span>
            </div>
          </div>
          <ul className="p-1.5">
            {userMenuNav.map((item) => (
              <li key={item.label}>
                <Link
                  to={item.to}
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <item.icon className="size-4" />
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="border-t border-border p-1.5">
            <Link
              to="/auth/login"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-surface hover:text-foreground"
            >
              <LogOut className="size-4" />
              Sign out
            </Link>
            <p className="px-3 pb-1 pt-1 text-[10px] text-muted-foreground">
              Sign out is a demo action until accounts are wired.
            </p>
          </div>
        </div>
      )}
    </div>
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
            <p className="mt-1 font-mono text-lg font-semibold">{demoLearner.currentStreak} days</p>
            <FutureTag className="mt-2" label="Demo · integration-ready" />
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
          <div className="absolute inset-y-0 left-0 flex w-[17.5rem] max-w-[85vw] flex-col border-r border-border bg-surface">
            <div className="flex h-16 items-center justify-between border-b border-border px-4">
              <Logo />
              <button
                aria-label="Close navigation"
                onClick={() => setMobileOpen(false)}
                className="rounded-md p-2 text-muted-foreground hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="border-b border-border px-4 py-3">
              <p className="truncate text-sm font-semibold">{demoLearner.displayName}</p>
              <p className="truncate font-mono text-[11px] text-muted-foreground">@{demoLearner.handle}</p>
            </div>
            <div className="flex-1 overflow-y-auto px-2 py-5">
              <NavList onNavigate={() => setMobileOpen(false)} />
            </div>
            <div className="border-t border-border p-2">
              <Link
                to="/auth/login"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-surface-2 hover:text-foreground"
              >
                <LogOut className="size-4" /> Sign out
              </Link>
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
            className="rounded-md p-2 text-muted-foreground hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
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
            <Tag tone="signal" className="hidden lg:inline-flex">
              Sandbox only
            </Tag>
            <Link
              to="/tutor"
              className={cn(buttonClass({ variant: "outline", size: "sm" }), "hidden sm:inline-flex")}
            >
              <Sparkles className="size-3.5 text-primary" />
              Ask tutor
            </Link>
            <Link
              to="/notifications"
              aria-label="Notifications"
              className="relative rounded-lg border border-border bg-surface/60 p-2 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Bell className="size-4" />
              <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-primary" />
            </Link>
            <UserMenu />
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl px-4 py-8 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
