import { createFileRoute, Link } from "@tanstack/react-router";
import { KeyRound } from "lucide-react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button, Field, Input, FutureSurface } from "@/components/kit/primitives";

export const Route = createFileRoute("/auth/reset")({
  head: () => ({
    meta: [
      { title: "Reset password — LinuxForge AI" },
      { name: "description", content: "Request a password reset link for your LinuxForge AI account." },
      { property: "og:title", content: "Reset password — LinuxForge AI" },
      { property: "og:description", content: "Request a password reset link for LinuxForge AI." },
    ],
  }),
  component: ResetPage,
});

function ResetPage() {
  return (
    <AuthLayout
      eyebrow="Account recovery"
      title="Reset your password"
      description="Enter the email tied to your forge profile and we'll send a single-use reset link."
      footer={
        <span>
          Remembered it?{" "}
          <Link to="/auth/login" className="text-primary hover:underline">
            Back to sign in
          </Link>
        </span>
      }
    >
      <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
        <Field label="Email">
          <Input type="email" placeholder="you@example.com" />
        </Field>
        <Button type="submit" className="w-full" size="lg" disabled>
          Send reset link
        </Button>
      </form>
      <FutureSurface
        className="mt-6"
        icon={<KeyRound className="size-5" />}
        title="Recovery email delivery"
        description="The confirmation state and email delivery arrive with the account system."
      />
    </AuthLayout>
  );
}
