import { describe, expect, it } from "vitest";
import { verifyExercise } from "../engine";
import { classifyCompletionQuality } from "../verdict";
import type { ExerciseContract, VerificationEvidence } from "../types";

const evidence: VerificationEvidence = {
  environmentId: "env-1",
  environmentGeneration: 2,
  runtimeId: "runtime-1",
  runtimeLifecycleGeneration: 7,
  capturedAt: new Date().toISOString(),
  filesystem: [
    {
      path: "/home/linuxforge/report.txt",
      objectType: "file",
      permissions: "640",
      owner: "root",
      group: "app",
      sizeBytes: 5,
      content: "hello",
      contentTruncated: false,
    },
  ],
  processes: [{ pid: 42, command: "nginx", state: "S", user: "root" }],
  services: [{ name: "nginx.service", state: "running", enabled: true }],
  network: [{ port: 8080, process: "nginx" }],
};
const contract: ExerciseContract = {
  exerciseId: "m5-test",
  version: 1,
  objective: "Secure the report",
  concepts: ["permissions", "ownership"],
  requirements: [
    {
      id: "file",
      kind: "filesystem",
      path: "/home/linuxforge/report.txt",
      objectType: "file",
      exists: true,
    },
    {
      id: "perm",
      kind: "permissions",
      path: "/home/linuxforge/report.txt",
      permissions: "640",
    },
    {
      id: "owner",
      kind: "ownership",
      path: "/home/linuxforge/report.txt",
      owner: "root",
      group: "app",
    },
    {
      id: "content",
      kind: "content",
      path: "/home/linuxforge/report.txt",
      mode: "contains",
      value: "hello",
    },
    { id: "service", kind: "service", name: "nginx.service", state: "running" },
    { id: "port", kind: "network", port: 8080, listening: true, process: "nginx" },
  ],
};

describe("M5 semantic verification", () => {
  it("passes authoritative filesystem, permissions, ownership, content, service and network evidence", () => {
    const result = verifyExercise(contract, evidence);
    expect(result.verdict).toBe("PASS");
    expect(result.score).toBe(100);
  });
  it("supports independent completion consumption", () => {
    expect(
      classifyCompletionQuality({ verdict: "PASS", hintsUsed: 0, solutionRevealed: false })
        .consumed,
    ).toBe(true);
  });
  it("does not consume assisted completion", () => {
    expect(
      classifyCompletionQuality({ verdict: "PASS", hintsUsed: 1, solutionRevealed: false })
        .consumed,
    ).toBe(false);
  });
});
