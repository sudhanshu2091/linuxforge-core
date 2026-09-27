import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureLabSession } from "./lab.server";
import { authorizeVerifiedRuntimeAccess } from "./runtime-identity.server";
import { authorizeTerminalSession, createTerminalSession } from "./terminal-control.server";

export type TerminalTicketClaims = {
  userId: string;
  labId: string;
  environmentId: string;
  sessionId: string;
  shell: "bash" | "zsh" | "sh";
  cwd: string;
  bindingGeneration: number;
  runtimeLifecycleGeneration: number;
  exp: number;
  nonce: string;
};

function secret(): Buffer {
  const value = process.env["FORGE_TERMINAL_TICKET_SECRET"];
  if (!value || value.length < 32)
    throw new Error("Terminal ticket secret is not configured securely.");
  return Buffer.from(value, "utf8");
}

function encode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createTerminalTicket(
  claims: Omit<TerminalTicketClaims, "exp" | "nonce">,
  ttlSeconds = 60,
): string {
  const payload = encode(
    JSON.stringify({
      ...claims,
      exp: Math.floor(Date.now() / 1000) + Math.max(15, Math.min(300, ttlSeconds)),
      nonce: randomBytes(16).toString("hex"),
    }),
  );
  return `${payload}.${sign(payload)}`;
}

export function verifyTerminalTicket(token: string): TerminalTicketClaims {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) throw new Error("Invalid terminal ticket.");
  const expected = sign(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b))
    throw new Error("Invalid terminal ticket signature.");
  const claims = JSON.parse(
    Buffer.from(payload, "base64url").toString("utf8"),
  ) as TerminalTicketClaims;
  if (!claims.userId || !claims.labId || !claims.environmentId || !claims.sessionId) {
    throw new Error("Invalid terminal ticket claims.");
  }
  if (!Number.isSafeInteger(claims.bindingGeneration) || claims.bindingGeneration < 1) {
    throw new Error("Invalid terminal ticket binding generation.");
  }
  if (
    !Number.isSafeInteger(claims.runtimeLifecycleGeneration) ||
    claims.runtimeLifecycleGeneration < 1
  ) {
    throw new Error("Invalid terminal ticket runtime generation.");
  }
  if (claims.exp < Math.floor(Date.now() / 1000)) throw new Error("Terminal ticket expired.");
  return claims;
}

export async function issueTerminalTicket(
  db: SupabaseClient,
  userId: string,
  input: { sessionId: string; shell: "bash" | "zsh" | "sh"; cwd: string },
): Promise<{
  ticket: string;
  websocketUrl: string;
  expiresAt: string;
  environmentId: string;
  sessionId: string;
  bindingGeneration: number;
  runtimeLifecycleGeneration: number;
}> {
  const session = await ensureLabSession(db, userId);
  if (!session.ok) throw new Error(session.error.message);
  if (!session.value.descriptor.capabilities.realLinux)
    throw new Error("Interactive PTY requires the real isolated Linux runtime.");
  if (!session.value.isolationBinding || !session.value.isolationVerification)
    throw new Error("Runtime isolation has not been verified.");
  authorizeVerifiedRuntimeAccess({
    binding: session.value.isolationBinding,
    verification: session.value.isolationVerification,
    learnerId: userId,
    labId: session.value.handle.labId,
    runtimeId: session.value.isolationBinding.runtimeId,
    bindingGeneration: session.value.isolationBinding.bindingGeneration,
  });
  const gateway = process.env["FORGE_TERMINAL_GATEWAY_URL"];
  if (!gateway) throw new Error("Interactive terminal gateway is not configured.");
  const ws = gateway
    .replace(/^http:/, "ws:")
    .replace(/^https:/, "wss:")
    .replace(/\/$/, "");
  const runtimeLifecycleGeneration = Number(
    session.value.descriptor.metadata["lifecycleGeneration"] ??
      session.value.descriptor.metadata["runtimeLifecycleGeneration"] ??
      1,
  );
  if (!Number.isSafeInteger(runtimeLifecycleGeneration) || runtimeLifecycleGeneration < 1) {
    throw new Error("Runtime lifecycle generation is unavailable.");
  }
  if (!session.value.isolationBinding) throw new Error("Runtime binding is unavailable.");
  const claims = {
    userId,
    labId: session.value.handle.labId,
    environmentId: session.value.handle.environmentId,
    sessionId: input.sessionId,
    shell: input.shell,
    cwd: input.cwd || "/home/linuxforge",
    bindingGeneration: session.value.isolationBinding.bindingGeneration,
    runtimeLifecycleGeneration,
  };
  const terminalSession = await createTerminalSession({
    db,
    userId,
    instanceId: session.value.instanceId,
    runtimeId: session.value.isolationBinding.runtimeId,
    labId: session.value.handle.labId,
    sessionId: claims.sessionId,
    shell: claims.shell,
    cwd: claims.cwd,
    bindingGeneration: claims.bindingGeneration,
    runtimeLifecycleGeneration: claims.runtimeLifecycleGeneration,
  });
  await authorizeTerminalSession({
    db,
    userId,
    sessionId: terminalSession.sessionId,
    labId: claims.labId,
    runtimeId: session.value.isolationBinding.runtimeId,
    bindingGeneration: claims.bindingGeneration,
    runtimeLifecycleGeneration: claims.runtimeLifecycleGeneration,
  });
  const ticket = createTerminalTicket(claims);
  const exp = new Date(Date.now() + 60_000).toISOString();
  return {
    ticket,
    websocketUrl: `${ws}/v1/terminal`,
    expiresAt: exp,
    environmentId: claims.environmentId,
    sessionId: terminalSession.sessionId,
    bindingGeneration: claims.bindingGeneration,
    runtimeLifecycleGeneration: claims.runtimeLifecycleGeneration,
  };
}
