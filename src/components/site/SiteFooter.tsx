import { Link } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { Logo } from "@/components/kit/Logo";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface/40">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 lg:grid-cols-4 lg:px-8">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
            Learn Linux and defensive security by doing — guided by a mentor that explains things the way a
            senior engineer would.
          </p>
          <p className="mt-4 inline-flex items-center gap-2 rounded-md border border-signal/30 bg-signal/10 px-2.5 py-1 text-xs text-signal">
            <ShieldCheck className="size-3.5" />
            Practice is sandboxed and defensive-only
          </p>
        </div>
        <div>
          <p className="mb-3 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Learn</p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>
              <Link to="/learn" className="hover:text-foreground">
                Learning paths
              </Link>
            </li>
            <li>
              <Link to="/challenges" className="hover:text-foreground">
                Challenges
              </Link>
            </li>
            <li>
              <Link to="/terminal" className="hover:text-foreground">
                Practice terminal
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="mb-3 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Grow</p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>
              <Link to="/progress" className="hover:text-foreground">
                Progress
              </Link>
            </li>
            <li>
              <Link to="/achievements" className="hover:text-foreground">
                Achievements
              </Link>
            </li>
            <li>
              <Link to="/friends" className="hover:text-foreground">
                Squad
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="mb-3 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Account</p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>
              <Link to="/auth/login" className="hover:text-foreground">
                Sign in
              </Link>
            </li>
            <li>
              <Link to="/auth/signup" className="hover:text-foreground">
                Create account
              </Link>
            </li>
            <li>
              <Link to="/settings" className="hover:text-foreground">
                Settings
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border px-4 py-5 text-center font-mono text-[11px] uppercase tracking-widest text-muted-foreground lg:px-8">
        LinuxForge AI — interface preview build
      </div>
    </footer>
  );
}
