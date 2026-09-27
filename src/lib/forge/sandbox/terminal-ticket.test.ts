import { createHmac } from "node:crypto";
import { describe, expect, test } from "vitest";
import { createTerminalTicket, verifyTerminalTicket } from "./terminal-ticket.server";

describe("V49 terminal tickets", () => {
  test("round trips scoped claims", () => {
    process.env["FORGE_TERMINAL_TICKET_SECRET"] = "v49-test-secret-that-is-at-least-32-bytes-long";
    const token = createTerminalTicket({
      userId: "user-1",
      labId: "lab-1",
      environmentId: "env-1",
      sessionId: "session-1",
      shell: "bash",
      cwd: "/home/linuxforge",
      bindingGeneration: 2,
      runtimeLifecycleGeneration: 7,
    });
    const claims = verifyTerminalTicket(token);
    expect(claims.userId).toBe("user-1");
    expect(claims.labId).toBe("lab-1");
    expect(claims.environmentId).toBe("env-1");
    expect(claims.sessionId).toBe("session-1");
  });

  test("rejects tampered tickets", () => {
    process.env["FORGE_TERMINAL_TICKET_SECRET"] = "v49-test-secret-that-is-at-least-32-bytes-long";
    const token = createTerminalTicket({
      userId: "user-1",
      labId: "lab-1",
      environmentId: "env-1",
      sessionId: "session-1",
      shell: "bash",
      cwd: "/home/linuxforge",
      bindingGeneration: 2,
      runtimeLifecycleGeneration: 7,
    });
    const [payload, signature] = token.split(".");
    expect(() => verifyTerminalTicket(`${payload}.${(signature ?? "").slice(0, -1)}x`)).toThrow(
      /signature/i,
    );
  });
});

test("rejects tickets without lifecycle generation claims", () => {
  process.env["FORGE_TERMINAL_TICKET_SECRET"] = "v49-test-secret-that-is-at-least-32-bytes-long";
  const payload = Buffer.from(
    JSON.stringify({
      userId: "user-1",
      labId: "lab-1",
      environmentId: "env-1",
      sessionId: "session-1",
      shell: "bash",
      cwd: "/home/linuxforge",
      exp: Math.floor(Date.now() / 1000) + 60,
      nonce: "nonce",
    }),
  ).toString("base64url");
  const signature = createHmac("sha256", process.env["FORGE_TERMINAL_TICKET_SECRET"]!)
    .update(payload)
    .digest("base64url");
  const token = `${payload}.${signature}`;
  expect(() => verifyTerminalTicket(token)).toThrow(/generation/i);
});
