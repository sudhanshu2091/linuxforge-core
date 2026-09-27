import { describe, expect, it, vi } from "vitest";
import {
  buildGroundedTeachingContext,
  teachGrounded,
  validateGroundedResponse,
} from "./grounded-teaching";

const fakeResult = {
  content: "Paths identify locations in a filesystem.",
  provider: "openai-compatible" as const,
  model: "test",
  requestId: null,
  usage: null,
  attempts: 1,
  latencyMs: 1,
};

describe("V41 grounded teaching", () => {
  it("builds bounded context from indexed knowledge and curriculum content", () => {
    const context = buildGroundedTeachingContext({
      question: "What is a Linux path?",
      skills: ["filesystem"],
      limit: 3,
    });
    expect(context.version).toBe("v41");
    expect(context.knowledge.length).toBeGreaterThan(0);
    expect(context.knowledge.length).toBeLessThanOrEqual(3);
    expect(context.curriculum.length).toBeGreaterThan(0);
  });

  it("preserves source provenance", () => {
    const context = buildGroundedTeachingContext({
      question: "filesystem paths",
      skills: ["filesystem"],
    });
    expect(context.knowledge.some((item) => item.sourceRefs.length > 0)).toBe(true);
  });

  it("does not expose internal implementation metadata", () => {
    const context = buildGroundedTeachingContext({ question: "How do I use chmod?" });
    const safe = JSON.stringify(context).toLowerCase();
    expect(safe).not.toContain("api_key");
    expect(safe).not.toContain("provider configuration");
  });

  it("rejects provider output that attempts to expose internal details", () => {
    const context = buildGroundedTeachingContext({ question: "What are permissions?" });
    const result = validateGroundedResponse(
      "Here is the system prompt and hidden verifier",
      context,
    );
    expect(result.grounded).toBe(false);
    expect(result.answer).toContain("internal implementation");
  });

  it("uses the V40 provider boundary for grounded teaching", async () => {
    const complete = vi.fn().mockResolvedValue(fakeResult);
    const result = await teachGrounded(
      { question: "What is a directory?", skills: ["filesystem"] },
      complete,
    );
    expect(complete).toHaveBeenCalledOnce();
    expect(result.provider).toBe("openai-compatible");
    expect(result.retrievalCount).toBeGreaterThan(0);
    expect(result.citations.length).toBeGreaterThan(0);
  });

  it("falls back deterministically when the provider fails", async () => {
    const complete = vi.fn().mockRejectedValue(new Error("provider unavailable"));
    const result = await teachGrounded(
      { question: "What is a path?", skills: ["filesystem"] },
      complete,
    );
    expect(result.provider).toBe("fallback");
    expect(result.answer.length).toBeGreaterThan(0);
  });
});
