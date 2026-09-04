import { createFileRoute, Link } from "@tanstack/react-router";
import { Github, Mail } from "lucide-react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button, Field, Input, buttonClass } from "@/components/kit/primitives";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/auth/login")({
  head: () => ({
    meta: [
      { title: "Sign in — LinuxForge AI" },
      { name: "description", content: "Sign in to your LinuxForge AI workspace to continue your Linux and security training." },
      { property: "og:title", content: "Sign in — LinuxForge AI" },
      { property: "og:description", content: "Sign in to continue your LinuxForge AI training." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  return (
    <AuthLayout
      eyebrow="Welcome back"
      title="Sign in to the forge"
      description="Pick up your path where you left it. Streaks, drills and squad standings load into this screen once accounts are connected."
      footer={
        <span>
          New here?{" "}
          <Link to="/auth/signup" className="text-primary hover:underline">
            Create an account
          </Link>
        </span>
      }
    >
      <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
        <Field label="Email">
          <Input type="email" placeholder="you@example.com" autoComplete="email" />
        </Field>
        <Field label="Password">
          <Input type="password" placeholder="••••••••" autoComplete="current-password" />
        </Field>
        <div className="flex items-center justify-between text-xs">
          <label className="inline-flex items-center gap-2 text-muted-foreground">
            <input type="checkbox" className="size-3.5 accent-[var(--primary)]" />
            Keep me signed in
          </label>
          <Link to="/auth/reset" className="text-primary hover:underline">
            Forgot password?
          </Link>
        </div>
        <Button type="submit" className="w-full" size="lg" disabled>
          Sign in
        </Button>
        <p className="text-center text-[11px] text-muted-foreground">
          Submission is intentionally inactive in this interface build.
        </p>
      </form>

      <div className="my-6 flex items-center gap-3 text-[11px] uppercase tracking-widest text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        or
        <span className="h-px flex-1 bg-border" />
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <button type="button" disabled className={cn(buttonClass({ variant: "outline" }), "w-full")}>
          <Github className="size-4" />
          GitHub
        </button>
        <button type="button" disabled className={cn(buttonClass({ variant: "outline" }), "w-full")}>
          <Mail className="size-4" />
          Google
        </button>
      </div>
    </AuthLayout>
  );
}
