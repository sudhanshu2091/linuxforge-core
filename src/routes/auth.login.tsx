import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button, Field, Input, Tag } from "@/components/kit/primitives";
import { useAuth } from "@/lib/auth";

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
  const { signIn, session, status } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Already signed in (or session restored) → straight into the app.
  useEffect(() => {
    if (session) void navigate({ to: "/dashboard", replace: true });
  }, [session, navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const result = await signIn(email.trim(), password);
    setBusy(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    void navigate({ to: "/dashboard", replace: true });
  }

  return (
    <AuthLayout
      eyebrow="Welcome back"
      title="Sign in to the forge"
      description="Pick up your path where you left it. Your profile and tutor preferences load with your account."
      footer={
        <span>
          New here?{" "}
          <Link to="/auth/signup" className="text-primary hover:underline">
            Create an account
          </Link>
        </span>
      }
    >
      <form className="space-y-4" onSubmit={onSubmit}>
        <Field label="Email">
          <Input
            type="email"
            required
            placeholder="you@example.com"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field label="Password">
          <Input
            type="password"
            required
            placeholder="••••••••"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        <div className="flex items-center justify-end text-xs">
          <Link to="/auth/reset" className="text-primary hover:underline">
            Forgot password?
          </Link>
        </div>

        {error ? (
          <p
            role="alert"
            className="rounded-lg border border-destructive/35 bg-destructive/10 px-3 py-2 text-xs text-destructive"
          >
            {error}
          </p>
        ) : null}

        <Button type="submit" className="w-full" size="lg" disabled={busy || status === "loading"}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : null}
          {busy ? "Signing in…" : "Sign in"}
        </Button>
        <div className="flex justify-center">
          <Tag tone="signal">Sessions stay signed in until you sign out</Tag>
        </div>
      </form>
    </AuthLayout>
  );
}
