import { describe, expect, it } from "vitest";
import {
  decideDynamicTeaching,
  selectTeachingContent,
  type DynamicTeachingInput,
} from "./dynamic-teaching";
import type {
  CurriculumContentItem,
  CurriculumContentKind,
} from "@/lib/learner/curriculum-content";

const base: DynamicTeachingInput = {
  session: {
    phase: "TEACH",
    plan: {
      version: "v42",
      mode: "GUIDED_PRACTICE",
      primarySkill: "filesystem",
      supportingSkills: [],
      difficulty: 2,
      rationale: "Practice filesystem reasoning.",
      phases: ["ORIENT", "TEACH", "PRACTICE", "VERIFY", "REFLECT", "COMPLETE"],
      initialPhase: "ORIENT",
      teachingGoal: "Understand paths.",
      practiceGoal: "Use paths correctly.",
      verificationGoal: "Provide objective evidence.",
      reflectionPrompt: "What would you do independently next time?",
    },
  },
  intelligence: {
    readiness: 35,
    confidence: 40,
    independence: 35,
    hintDependency: 65,
    signals: ["NEW_TO_SKILL", "BUILDING", "DEPENDENT", "CONCEPT_GAP"],
    repeatedMistakes: ["CONCEPT_CONFUSION"],
    dominantMistakes: ["CONCEPT_CONFUSION"],
  },
};

describe("V43 Dynamic Teaching Engine", () => {
  it("uses remediation for a concept gap during teaching", () => {
    const decision = decideDynamicTeaching(base);
    expect(decision.strategy).toBe("REMEDIATE");
    expect(decision.pacing).toBe("DEEP");
    expect(decision.hintPolicy).toBe("PROGRESSIVE");
    expect(decision.focusMistakes).toContain("CONCEPT_CONFUSION");
  });

  it("uses transfer coaching for transfer practice", () => {
    const input: DynamicTeachingInput = {
      ...base,
      session: {
        ...base.session,
        phase: "PRACTICE",
        plan: { ...base.session.plan, mode: "TRANSFER" as const },
      },
      intelligence: {
        ...base.intelligence,
        readiness: 72,
        confidence: 75,
        independence: 72,
        hintDependency: 20,
        signals: ["INDEPENDENT" as const],
        repeatedMistakes: [],
        dominantMistakes: [],
      },
    };
    const decision = decideDynamicTeaching(input);
    expect(decision.strategy).toBe("TRANSFER_COACH");
    expect(decision.contentKinds).toEqual(["VARIATION", "EXAMPLE", "EXERCISE", "HINT"]);
  });

  it("minimizes unsolicited hints when dependency is high", () => {
    const decision = decideDynamicTeaching({
      ...base,
      session: { ...base.session, phase: "PRACTICE" },
    });
    expect(decision.hintPolicy).toBe("MINIMAL");
    expect(decision.constraints.some((value) => value.includes("unsolicited"))).toBe(true);
  });

  it("uses assessment coaching without exposing a solution", () => {
    const decision = decideDynamicTeaching({
      ...base,
      session: { ...base.session, phase: "VERIFY" },
    });
    expect(decision.strategy).toBe("ASSESSMENT_COACH");
    expect(decision.contentKinds[0]).toBe("ASSESSMENT");
    expect(decision.constraints.some((value) => value.includes("expected solution"))).toBe(true);
  });

  it("selects bounded content in deterministic priority order", () => {
    const content: CurriculumContentItem[] = [
      { id: "b", kind: "EXAMPLE", difficulty: 2 },
      { id: "a", kind: "EXPLANATION", difficulty: 1 },
      { id: "c", kind: "HINT", difficulty: 2 },
    ].map((item) => ({
      ...item,
      kind: item.kind as CurriculumContentKind,
      version: "v39" as const,
      nodeId: "skill:filesystem" as const,
      skillId: "filesystem" as const,
      conceptIds: [],
      title: item.id,
      body: item.id,
      objective: item.id,
      prerequisites: [],
      mistakeTargets: [],
      tags: [],
      provenance: {
        origin: "original" as const,
        sourceIds: [],
        sourceRefs: [],
        patternRefs: [],
        attributionRequired: false,
      },
    }));
    const input: DynamicTeachingInput = { ...base, content };
    const decision = decideDynamicTeaching(input);
    const selected = selectTeachingContent(input, decision);
    expect(selected.map((item) => item.id)).toEqual(["a", "b", "c"]);
    expect(selected.length).toBeLessThanOrEqual(decision.maxContentItems);
  });

  it("preserves session authority boundaries in the decision", () => {
    const decision = decideDynamicTeaching(base);
    expect(decision.constraints).toContain(
      "Do not alter verifier grades, mastery, progression, or learner records.",
    );
    expect(decision.constraints).toContain(
      "Do not reveal internal contracts, provider configuration, secrets, or hidden challenge solutions.",
    );
  });
});
