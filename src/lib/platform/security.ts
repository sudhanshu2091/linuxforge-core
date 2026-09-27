import type { SecurityDecision, SecurityEvent } from "./types";

const WINDOW_MS = 60_000;
const MAX_ACTIONS = 120;
const MAX_DENIALS = 8;

export function evaluateSecurity(input: { recentEvents: readonly SecurityEvent[]; now?: Date }): {
  decision: SecurityDecision;
  reason: string;
} {
  const now = (input.now ?? new Date()).getTime();
  const recent = input.recentEvents.filter(
    (event) => now - Date.parse(event.occurredAt) <= WINDOW_MS,
  );
  if (recent.length >= MAX_ACTIONS) {
    return { decision: "THROTTLE", reason: "Action-rate limit exceeded." };
  }
  const denials = recent.filter(
    (event) => event.decision === "DENY" || event.decision === "QUARANTINE",
  ).length;
  if (denials >= MAX_DENIALS) {
    return {
      decision: "QUARANTINE",
      reason: "Repeated security-boundary violations.",
    };
  }
  return { decision: "ALLOW", reason: "Within platform action limits." };
}
