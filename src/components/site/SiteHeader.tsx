import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/kit/Logo";
import { buttonClass } from "@/components/kit/primitives";
import { cn } from "@/lib/utils";

const marketingLinks = [
  { href: "/#paths", label: "Learning paths" },
  { href: "/#tutor", label: "AI tutor" },
  { href: "/#labs", label: "Labs" },
  { href: "/#progression", label: "Progression" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 lg:px-8">
        <Logo />
        <nav className="hidden items-center gap-1 md:flex">
          {marketingLinks.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-surface hover:text-foreground"
            >
              {l.label}
            </a>
          ))}
        </nav>
        <div className="ml-auto hidden items-center gap-2 md:flex">
          <Link to="/dashboard" className={buttonClass({ variant: "ghost", size: "sm" })}>
            Product tour
          </Link>
          <Link to="/auth/login" className={buttonClass({ variant: "outline", size: "sm" })}>
            Sign in
          </Link>
          <Link to="/auth/signup" className={buttonClass({ size: "sm" })}>
            Start forging
          </Link>
        </div>
        <button
          aria-label="Open menu"
          onClick={() => setOpen((v) => !v)}
          className="ml-auto rounded-md p-2 text-muted-foreground hover:bg-surface md:hidden"
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>
      {open && (
        <div className="border-t border-border bg-surface px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-1">
            {marketingLinks.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-surface-2 hover:text-foreground"
              >
                {l.label}
              </a>
            ))}
          </nav>
          <div className="mt-4 flex flex-col gap-2">
            <Link to="/auth/login" className={cn(buttonClass({ variant: "outline" }), "w-full")}>
              Sign in
            </Link>
            <Link to="/auth/signup" className={cn(buttonClass(), "w-full")}>
              Start forging
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
