import { describe, expect, it } from "vitest";
import { PREREQUISITES } from "./mastery-engine";
import type { SkillId } from "@/lib/forge/types";
import {
  CURRICULUM_EDGES,
  CURRICULUM_GRAPH_VERSION,
  CURRICULUM_NODES,
  getPhaseSkills,
  getPrerequisiteSkills,
  getRelatedConcepts,
  validateCurriculumGraph,
} from "./curriculum-graph";

describe("V38 curriculum knowledge graph", () => {
  it("contains deterministic domain, phases, skills and concepts", () => {
    expect(CURRICULUM_GRAPH_VERSION).toBe("v38");
    expect(CURRICULUM_NODES.some((node) => node.id === "domain:linux")).toBe(true);
    expect(getPhaseSkills("phase:foundations")).toEqual(["filesystem", "permissions"]);
    expect(getPhaseSkills("phase:shell-operator")).toEqual(["iteration", "shell-scripting"]);
  });

  it("mirrors V36 prerequisite authority without creating a second prerequisite policy", () => {
    for (const skill of Object.keys(PREREQUISITES) as SkillId[]) {
      expect(getPrerequisiteSkills(skill)).toEqual(PREREQUISITES[skill]);
    }
  });

  it("connects skills to teachable concepts", () => {
    expect(getRelatedConcepts("permissions").map((node) => node.id)).toEqual([
      "concept:ownership",
      "concept:rwx",
    ]);
    expect(getRelatedConcepts("hardening").map((node) => node.id)).toContain(
      "concept:service-hardening",
    );
  });

  it("has no broken references or duplicated nodes", () => {
    expect(validateCurriculumGraph()).toEqual([]);
    expect(CURRICULUM_EDGES.length).toBeGreaterThan(0);
  });
});
