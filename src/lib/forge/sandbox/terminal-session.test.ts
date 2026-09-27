import { describe, expect, it } from "vitest";
import {
  DEFAULT_TERMINAL_SESSION_LIMITS,
  InMemoryTerminalSessionLog,
  attachTerminalSession,
  closeTerminalSession,
  createTerminalEvent,
  assertTerminalSessionInput,
  assertTerminalBinding,
  type TerminalSession,
} from "./terminal-session";

const session = (): TerminalSession => ({
  sessionId: "session-1",
  userId: "user-1",
  environmentId: "env-1",
  shell: "bash",
  cwd: "/home/learner",
  state: "CREATED",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  lastSequence: 0,
});

describe("v21 terminal session protocol", () => {
  it("attaches a newly created session", () => {
    expect(attachTerminalSession(session()).state).toBe("ATTACHED");
  });

  it("rejects input after close", () => {
    expect(() => assertTerminalSessionInput(closeTerminalSession(session()), "ls")).toThrow(
      /closed/i,
    );
  });

  it("sequences events monotonically", () => {
    const first = createTerminalEvent(attachTerminalSession(session()), "INPUT", "ls");
    const second = createTerminalEvent(first.session, "OUTPUT", "file.txt");
    expect(first.event.sequence).toBe(1);
    expect(second.event.sequence).toBe(2);
  });

  it("binds every event to its session", () => {
    const result = createTerminalEvent(session(), "INPUT", "pwd");
    expect(result.event.sessionId).toBe("session-1");
  });

  it("rejects oversized input", () => {
    const limits = { ...DEFAULT_TERMINAL_SESSION_LIMITS, maxInputBytes: 2 };
    expect(() => assertTerminalSessionInput(session(), "abcd", limits)).toThrow(/too large/i);
  });

  it("rejects oversized event data", () => {
    const limits = { ...DEFAULT_TERMINAL_SESSION_LIMITS, maxDataBytes: 2 };
    expect(() => createTerminalEvent(session(), "OUTPUT", "abcd", undefined, limits)).toThrow(
      /too large/i,
    );
  });

  it("keeps a bounded event log", () => {
    const log = new InMemoryTerminalSessionLog({
      ...DEFAULT_TERMINAL_SESSION_LIMITS,
      maxEvents: 2,
    });
    let current = session();
    for (const value of ["a", "b", "c"]) {
      const next = createTerminalEvent(current, "OUTPUT", value);
      current = next.session;
      log.append(next.event);
    }
    expect(log.list("session-1").map((event) => event.data)).toEqual(["b", "c"]);
  });

  it("rejects non-contiguous persisted events", () => {
    const log = new InMemoryTerminalSessionLog();
    expect(() =>
      log.append({
        sequence: 2,
        sessionId: "session-1",
        kind: "OUTPUT",
        data: "x",
        createdAt: "now",
      }),
    ).toThrow(/strictly increasing/i);
  });

  it("rejects a terminal attach from another lab", () => {
    const bound = { ...session(), labId: "lab-a", runtimeId: "runtime-a", bindingGeneration: 2 };
    expect(() =>
      assertTerminalBinding({
        session: bound,
        learnerId: "user-1",
        labId: "lab-b",
        runtimeId: "runtime-a",
        bindingGeneration: 2,
      }),
    ).toThrow(/lab/i);
  });

  it("rejects stale runtime generations", () => {
    const bound = { ...session(), labId: "lab-a", runtimeId: "runtime-a", bindingGeneration: 2 };
    expect(() =>
      assertTerminalBinding({
        session: bound,
        learnerId: "user-1",
        labId: "lab-a",
        runtimeId: "runtime-a",
        bindingGeneration: 1,
      }),
    ).toThrow(/generation/i);
  });

  it("closing an already closed session is idempotent", () => {
    const closed = closeTerminalSession(session());
    expect(closeTerminalSession(closed)).toEqual(closed);
  });
});
