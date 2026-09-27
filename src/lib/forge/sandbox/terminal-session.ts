/**
 * LinuxForge v21 terminal-session protocol.
 *
 * Provider-neutral session state and bounded event sequencing for the learner
 * terminal. This is intentionally safe to use from the UI and from a future
 * authenticated WebSocket/PTY gateway: no provider, host process, socket, or
 * credential details leak into the protocol.
 */
import { SHELLS, type ShellName } from "./contract";

export const TERMINAL_SESSION_STATES = ["CREATED", "ATTACHED", "CLOSING", "CLOSED"] as const;
export type TerminalSessionState = (typeof TERMINAL_SESSION_STATES)[number];

export const TERMINAL_EVENT_KINDS = [
  "INPUT",
  "OUTPUT",
  "ERROR",
  "SYSTEM",
  "RESIZE",
  "SIGNAL",
] as const;
export type TerminalEventKind = (typeof TERMINAL_EVENT_KINDS)[number];

export type TerminalSession = {
  sessionId: string;
  userId: string;
  environmentId: string;
  /** V45 tenant/runtime binding; legacy protocol fields remain unchanged. */
  labId?: string;
  runtimeId?: string;
  bindingGeneration?: number;
  shell: ShellName;
  cwd: string;
  state: TerminalSessionState;
  createdAt: string;
  updatedAt: string;
  lastSequence: number;
};

export type TerminalSessionEvent = {
  sequence: number;
  sessionId: string;
  kind: TerminalEventKind;
  data: string;
  createdAt: string;
};

export type TerminalSessionLimits = {
  maxEvents: number;
  maxInputBytes: number;
  maxDataBytes: number;
  maxCwdBytes: number;
};

export const DEFAULT_TERMINAL_SESSION_LIMITS: TerminalSessionLimits = {
  maxEvents: 1000,
  maxInputBytes: 16_000,
  maxDataBytes: 64_000,
  maxCwdBytes: 4096,
};

const encoder = new TextEncoder();

const byteLength = (value: string) => encoder.encode(value).byteLength;

export function assertTerminalSessionInput(
  session: Pick<TerminalSession, "state" | "shell">,
  data: string,
  limits: TerminalSessionLimits = DEFAULT_TERMINAL_SESSION_LIMITS,
): void {
  if (session.state === "CLOSING" || session.state === "CLOSED")
    throw new Error("Terminal session is closed.");
  if (!(SHELLS as readonly string[]).includes(session.shell)) throw new Error("Unsupported shell.");
  if (byteLength(data) > limits.maxInputBytes) throw new Error("Terminal input is too large.");
}

export function assertTerminalEventData(
  data: string,
  limits: TerminalSessionLimits = DEFAULT_TERMINAL_SESSION_LIMITS,
): void {
  if (byteLength(data) > limits.maxDataBytes) throw new Error("Terminal event data is too large.");
}

export function nextTerminalSequence(session: Pick<TerminalSession, "lastSequence">): number {
  if (!Number.isSafeInteger(session.lastSequence) || session.lastSequence < 0)
    throw new Error("Invalid terminal event sequence.");
  return session.lastSequence + 1;
}

export function attachTerminalSession(
  session: TerminalSession,
  now = new Date().toISOString(),
): TerminalSession {
  if (session.state === "CLOSING" || session.state === "CLOSED")
    throw new Error("Cannot attach a closed terminal session.");
  return { ...session, state: "ATTACHED", updatedAt: now };
}

export function closeTerminalSession(
  session: TerminalSession,
  now = new Date().toISOString(),
): TerminalSession {
  if (session.state === "CLOSED") return session;
  return { ...session, state: "CLOSED", updatedAt: now };
}

export function createTerminalEvent(
  session: TerminalSession,
  kind: TerminalEventKind,
  data: string,
  now = new Date().toISOString(),
  limits: TerminalSessionLimits = DEFAULT_TERMINAL_SESSION_LIMITS,
): { session: TerminalSession; event: TerminalSessionEvent } {
  if (session.state === "CLOSING" || session.state === "CLOSED")
    throw new Error("Cannot emit an event for a closed terminal session.");
  assertTerminalEventData(data, limits);
  const sequence = nextTerminalSequence(session);
  const event = { sequence, sessionId: session.sessionId, kind, data, createdAt: now };
  return {
    session: { ...session, lastSequence: sequence, updatedAt: now },
    event,
  };
}

export class InMemoryTerminalSessionLog {
  private readonly events = new Map<string, TerminalSessionEvent[]>();
  constructor(private readonly limits: TerminalSessionLimits = DEFAULT_TERMINAL_SESSION_LIMITS) {}

  append(event: TerminalSessionEvent): void {
    assertTerminalEventData(event.data, this.limits);
    const current = this.events.get(event.sessionId) ?? [];
    const previous = current.at(-1)?.sequence ?? 0;
    if (event.sequence !== previous + 1)
      throw new Error("Terminal event sequence must be strictly increasing and contiguous.");
    current.push(event);
    if (current.length > this.limits.maxEvents)
      current.splice(0, current.length - this.limits.maxEvents);
    this.events.set(event.sessionId, current);
  }

  list(sessionId: string): TerminalSessionEvent[] {
    return [...(this.events.get(sessionId) ?? [])];
  }
}

/** V45 authorization guard for attaching a terminal to a runtime. */
export function assertTerminalBinding(input: {
  session: Pick<
    TerminalSession,
    "userId" | "environmentId" | "labId" | "runtimeId" | "bindingGeneration"
  >;
  learnerId: string;
  labId: string;
  runtimeId: string;
  bindingGeneration: number;
}): void {
  if (input.session.userId !== input.learnerId)
    throw new Error("Terminal access denied: learner ownership mismatch.");
  if (input.session.labId !== input.labId)
    throw new Error("Terminal access denied: lab ownership mismatch.");
  if (input.session.runtimeId !== input.runtimeId)
    throw new Error("Terminal access denied: runtime identity mismatch.");
  if (input.session.bindingGeneration !== input.bindingGeneration)
    throw new Error("Terminal access denied: stale binding generation.");
}
