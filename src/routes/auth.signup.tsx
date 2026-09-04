import { createFileRoute, Link } from "@tanstack/react-router";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button, Field, Input, Tag } from "@/components/kit/primitives";

export const Route = createFileRoute("/auth/signup")({
  head: () => ({
    meta: [
      { title: "Create account — LinuxForge AI" },
      {
        name: "description",
        content: "Create a LinuxForge AI account to start guided Linux and defensive cybersecurity training.",
      },
      { property: "og:title", content: "Create account — LinuxForge AI" },
      { property: "og:description", content: "Start guided Linux and defensive security training." },
    ],
  }),
  component: SignupPage,
});

const levels = ["Total beginner", "Some terminal time", "Comfortable, want depth"];
const langs = ["English", "Hinglish", "Mix both"];

function SignupPage() {
  return (
    <AuthLayout
      eyebrow="Join the forge"
      title="Create your learner profile"
      description="Tell us where you're starting from and how you like to be taught. We'll shape the first path around it."
      footer={
        <span>
          Already have an account?{" "}
          <Link to="/auth/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </span>
      }
    >
      <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Display name">
            <Input placeholder="forge_handle" />
          </Field>
          <Field label="Email">
            <Input type="email" placeholder="you@example.com" />
          </Field>
        </div>
        <Field label="Password" hint="At least 8 characters.">
          <Input type="password" placeholder="••••••••" autoComplete="new-password" />
        </Field>

        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">Current comfort level</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {levels.map((l, i) => (
              <label
                key={l}
                className="cursor-pointer rounded-lg border border-border bg-surface/60 px-3 py-2.5 text-xs has-[:checked]:border-primary/50 has-[:checked]:bg-primary/10 has-[:checked]:text-primary"
              >
                <input type="radio" name="level" defaultChecked={i === 0} className="sr-only" />
                {l}
              </label>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">Preferred tutor language</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {langs.map((l, i) => (
              <label
                key={l}
                className="cursor-pointer rounded-lg border border-border bg-surface/60 px-3 py-2.5 text-xs has-[:checked]:border-accent/50 has-[:checked]:bg-accent/10 has-[:checked]:text-accent"
              >
                <input type="radio" name="lang" defaultChecked={i === 2} className="sr-only" />
                {l}
              </label>
            ))}
          </div>
        </div>

        <label className="flex items-start gap-2.5 rounded-lg border border-signal/25 bg-signal/8 p-3 text-xs text-muted-foreground">
          <input type="checkbox" className="mt-0.5 size-3.5 accent-[var(--signal)]" />
          <span>
            I understand LinuxForge AI teaches <span className="text-signal">defensive</span> security inside a
            sandbox, and does not provide access to real systems or offensive tooling.
          </span>
        </label>

        <Button type="submit" className="w-full" size="lg" disabled>
          Create account
        </Button>
        <div className="flex justify-center">
          <Tag>Account creation connects in a later stage</Tag>
        </div>
      </form>
    </AuthLayout>
  );
}
