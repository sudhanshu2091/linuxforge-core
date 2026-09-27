import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, MailCheck } from "lucide-react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button, Field, Input, Panel, Tag } from "@/components/kit/primitives";
import {
  COMFORT_LEVELS,
  TUTOR_LANGUAGES,
  useAuth,
  type ComfortLevel,
  type TutorLanguage,
} from "@/lib/auth";

export const Route = createFileRoute("/auth/signup")({
  head: () => ({
    meta: [
      { title: "Create account — LinuxForge AI" },
      {
        name: "description",
        content:
          "Create a LinuxForge AI account to start guided Linux and defensive cybersecurity training.",
      },
      { property: "og:title", content: "Create account — LinuxForge AI" },
      {
        property: "og:description",
        content: "Start guided Linux and defensive security training.",
      },
    ],
  }),
  component: SignupPage,
});

function SignupPage() {
  const { signUp, session } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [comfort, setComfort] = useState<ComfortLevel>(COMFORT_LEVELS[0]!);
  const [language, setLanguage] = useState<TutorLanguage>("Mix both");
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmSent, setConfirmSent] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (session) void navigate({ to: "/dashboard", replace: true });
  }, [session, navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Use at least 8 characters for your password.");
      return;
    }
    setBusy(true);
    const result = await signUp({
      email: email.trim(),
      password,
      displayName: displayName.trim(),
      comfortLevel: comfort,
      tutorLanguage: language,
    });
    setBusy(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    if (result.needsEmailConfirmation) {
      setConfirmSent(true);
      return;
    }
    void navigate({ to: "/dashboard", replace: true });
  }

  if (confirmSent) {
    return (
      <AuthLayout
        eyebrow="Almost there"
        title="Confirm your email"
        description="We sent a confirmation link to your inbox. Open it and you'll be signed in to the forge."
        footer={
          <span>
            Already confirmed?{" "}
            <Link to="/auth/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </span>
        }
      >
        <Panel className="flex items-start gap-3">
          <MailCheck className="mt-0.5 size-5 text-signal" />
          <div>
            <p className="text-sm">Confirmation sent to {email}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Your learner profile and tutor preference are saved with your account and load the
              moment you sign in.
            </p>
          </div>
        </Panel>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      eyebrow="Join the forge"
      title="Create your learner profile"
      description="Tell us where you're starting from and how you like to be taught. Both choices are saved to your account."
      footer={
        <span>
          Already have an account?{" "}
          <Link to="/auth/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </span>
      }
    >
      <form className="space-y-4" onSubmit={onSubmit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Display name">
            <Input
              required
              placeholder="forge_handle"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </Field>
          <Field label="Email">
            <Input
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
        </div>
        <Field label="Password" hint="At least 8 characters.">
          <Input
            type="password"
            required
            minLength={8}
            placeholder="••••••••"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>

        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">Current comfort level</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {COMFORT_LEVELS.map((l) => (
              <label
                key={l}
                className="cursor-pointer rounded-lg border border-border bg-surface/60 px-3 py-2.5 text-xs has-[:checked]:border-primary/50 has-[:checked]:bg-primary/10 has-[:checked]:text-primary"
              >
                <input
                  type="radio"
                  name="level"
                  className="sr-only"
                  checked={comfort === l}
                  onChange={() => setComfort(l)}
                />
                {l}
              </label>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">Preferred tutor language</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {TUTOR_LANGUAGES.map((l) => (
              <label
                key={l}
                className="cursor-pointer rounded-lg border border-border bg-surface/60 px-3 py-2.5 text-xs has-[:checked]:border-accent/50 has-[:checked]:bg-accent/10 has-[:checked]:text-accent"
              >
                <input
                  type="radio"
                  name="lang"
                  className="sr-only"
                  checked={language === l}
                  onChange={() => setLanguage(l)}
                />
                {l}
              </label>
            ))}
          </div>
        </div>

        <label className="flex items-start gap-2.5 rounded-lg border border-signal/25 bg-signal/8 p-3 text-xs text-muted-foreground">
          <input
            type="checkbox"
            required
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            className="mt-0.5 size-3.5 accent-[var(--signal)]"
          />
          <span>
            I understand LinuxForge AI teaches <span className="text-signal">defensive</span>{" "}
            security inside a sandbox, and does not provide access to real systems or offensive
            tooling.
          </span>
        </label>

        {error ? (
          <p
            role="alert"
            className="rounded-lg border border-destructive/35 bg-destructive/10 px-3 py-2 text-xs text-destructive"
          >
            {error}
          </p>
        ) : null}

        <Button type="submit" className="w-full" size="lg" disabled={busy}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : null}
          {busy ? "Creating account…" : "Create account"}
        </Button>
        <div className="flex justify-center">
          <Tag tone="signal">Your level and tutor language save to your profile</Tag>
        </div>
      </form>
    </AuthLayout>
  );
}
