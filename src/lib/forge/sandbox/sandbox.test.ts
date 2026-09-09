/**
 * Sandbox foundation tests.
 *
 * These establish the security-critical properties: only the modelled provider
 * is dispatchable, the real-Linux adapter fails closed, and no execution path
 * can reach a host.
 */

import { describe, expect, test } from "vitest";
import {
  DEFAULT_RESOURCE_POLICY,
  MOCK_PROVIDER_ID,
  REAL_LINUX_PROVIDER_ID,
  type EnvironmentHandle,
  type SandboxFsObject,
  type SandboxFsView,
} from "./contract";
import { createMockSandboxProvider, type MockBackingStore, type SandboxInstanceRecord } from "./mock-provider.server";
import { ALLOWED_PROVIDER_IDS, configuredProviderId, isDispatchable } from "./registry.server";
import {
  createRealLinuxSandboxProvider,
  readRealLinuxProviderConfig,
  realLinuxProviderAvailability,
} from "./real-linux-provider.server";
import type { Mutation } from "../executor.server";

type Recorded = { input: string; cwdBefore: string; cwdAfter: string; exitCode: number };

function memoryStore(userId: string) {
  const fs: SandboxFsView = new Map();
  let instance: SandboxInstanceRecord | null = null;
  const events: Recorded[] = [];

  const store: MockBackingStore = {
    async readInstance(handle) {
      return instance && instance.environmentId === handle.environmentId ? instance : null;
    },
    async createInstance(input) {
      const now = new Date().toISOString();
      instance = {
        environmentId: "mock-env-test",
        userId: input.userId,
        labId: input.labId,
        status: "READY",
        snapshotId: null,
        createdAt: now,
        updatedAt: now,
        lastActiveAt: now,
        expiresAt: null,
        metadata: input.metadata,
      };
      return instance;
    },
    async patchInstance(_handle, patch) {
      if (!instance) throw new Error("no instance");
      instance = { ...instance, ...patch, metadata: patch.metadata ?? instance.metadata };
      return instance;
    },
    async readFilesystem() {
      return fs;
    },
    async applyMutations(_handle, challengeRef, mutations: Mutation[]) {
      for (const m of mutations) {
        if (m.kind === "create") {
          const obj: SandboxFsObject = {
            objectId: `obj:${m.path}`,
            objectType: m.objectType,
            path: m.path,
            name: m.path.split("/").pop() ?? m.path,
            permissions: m.permissions,
            content: m.content,
            active: true,
            createdByChallenge: challengeRef,
            lastModifiedByChallenge: challengeRef,
            createdAt: new Date().toISOString(),
          };
          fs.set(m.path, obj);
        } else {
          const cur = fs.get(m.path);
          if (cur)
            fs.set(m.path, {
              ...cur,
              permissions: m.permissions ?? cur.permissions,
              content: m.content ?? cur.content,
              lastModifiedByChallenge: challengeRef,
            });
        }
      }
    },
    async clearFilesystem() {
      fs.clear();
    },
  };

  return { store, fs, events, userId };
}

const handleFor = (userId: string, labId = "lab-1"): EnvironmentHandle => ({
  provider: MOCK_PROVIDER_ID,
  environmentId: "mock-env-test",
  userId,
  labId,
});

async function readyProvider(userId = "user-a") {
  const { store, fs } = memoryStore(userId);
  const provider = createMockSandboxProvider(store);
  const created = await provider.createEnvironment({
    userId,
    labId: "lab-1",
    resourcePolicy: DEFAULT_RESOURCE_POLICY,
    metadata: { lab_key: "forge-core" },
  });
  expect(created.ok).toBe(true);
  const started = await provider.startEnvironment(handleFor(userId));
  expect(started.ok).toBe(true);
  return { provider, fs, handle: handleFor(userId) };
}

describe("provider selection fails closed", () => {
  test("only the modelled provider is dispatchable", () => {
    expect(ALLOWED_PROVIDER_IDS).toEqual([MOCK_PROVIDER_ID]);
    expect(configuredProviderId()).toBe(MOCK_PROVIDER_ID);
    expect(isDispatchable(MOCK_PROVIDER_ID)).toBe(true);
    expect(isDispatchable(REAL_LINUX_PROVIDER_ID)).toBe(false);
    expect(isDispatchable("host-shell")).toBe(false);
  });

  test("real Linux provider is unavailable and cannot be constructed", () => {
    expect(readRealLinuxProviderConfig()).toBeNull();
    expect(realLinuxProviderAvailability().available).toBe(false);
    expect(() => createRealLinuxSandboxProvider()).toThrow(/No isolated Linux execution provider is configured/);
  });

  test("modelled provider never claims to be real Linux", async () => {
    const { provider } = await readyProvider();
    expect(provider.capabilities.realLinux).toBe(false);
    expect(provider.capabilities.modelled).toBe(true);
  });
});

describe("create/start ownership", () => {
  test("another learner's handle is denied", async () => {
    const { provider } = await readyProvider("user-a");
    const foreign = await provider.startEnvironment(handleFor("user-b"));
    expect(foreign.ok).toBe(false);
    if (!foreign.ok) expect(foreign.error.code).toBe("OWNERSHIP_DENIED");
  });

  test("execution for a foreign handle is refused before any work happens", async () => {
    const { provider } = await readyProvider("user-a");
    const res = await provider.executeCommand({
      handle: handleFor("user-b"),
      input: { kind: "raw-shell", data: "mkdir project" },
      cwd: "",
      challengeRef: null,
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe("OWNERSHIP_DENIED");
  });
});

describe("execution observations", () => {
  test("returns stdout, exit code, duration and filesystem delta", async () => {
    const { provider, handle } = await readyProvider();
    const created = await provider.executeCommand({
      handle,
      input: { kind: "raw-shell", data: "mkdir project" },
      cwd: "",
      challengeRef: "C01",
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(created.value.exitCode).toBe(0);
    expect(created.value.durationMs).toBeGreaterThan(0);
    expect(created.value.deltas.filesystem[0]?.path).toBe("project");
    expect(created.value.provider).toBe(MOCK_PROVIDER_ID);
    expect(created.value.stateAfter.filesystem.modelled).toBe(true);

    const listed = await provider.executeCommand({
      handle,
      input: { kind: "raw-shell", data: "ls" },
      cwd: "",
      challengeRef: "C01",
    });
    expect(listed.ok).toBe(true);
    if (listed.ok) expect(listed.value.stdout).toContain("project");
  });

  test("errors surface on stderr with a non-zero exit code", async () => {
    const { provider, handle } = await readyProvider();
    const res = await provider.executeCommand({
      handle,
      input: { kind: "raw-shell", data: "mkdri project" },
      cwd: "",
      challengeRef: "C01",
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.exitCode).toBe(1);
    expect(res.value.stderr).toContain("not modelled");
  });

  test("cwd changes persist across the record", async () => {
    const { provider, handle } = await readyProvider();
    await provider.executeCommand({ handle, input: { kind: "raw-shell", data: "mkdir project" }, cwd: "", challengeRef: null });
    const res = await provider.executeCommand({ handle, input: { kind: "raw-shell", data: "cd project" }, cwd: "", challengeRef: null });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.cwdBefore).toBe("");
      expect(res.value.cwdAfter).toBe("project");
    }
  });

  test("host and privileged input is blocked by policy, not executed", async () => {
    const { provider, handle } = await readyProvider();
    for (const input of ["sudo rm -rf /", "curl http://example.com", "cat /etc/passwd"]) {
      const res = await provider.executeCommand({ handle, input: { kind: "raw-shell", data: input }, cwd: "", challengeRef: null });
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.value.blocked).not.toBeNull();
        expect(res.value.exitCode).toBe(126);
        expect(res.value.deltas.filesystem).toHaveLength(0);
      }
    }
  });

  test("credentials in input are redacted before persistence", async () => {
    const { provider, handle } = await readyProvider();
    const res = await provider.executeCommand({
      handle,
      input: { kind: "raw-shell", data: "echo --token=supersecretvalue > note.txt" },
      cwd: "",
      challengeRef: null,
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.input).not.toContain("supersecretvalue");
      expect(res.value.redactedFields.length).toBeGreaterThan(0);
    }
  });

  test("stdin is refused by the modelled provider instead of faked", async () => {
    const { provider, handle } = await readyProvider();
    const res = await provider.sendInput({ handle, input: { kind: "stdin", data: "y\n" }, cwd: "", challengeRef: null });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe("UNSUPPORTED_OPERATION");
  });
});

describe("lifecycle", () => {
  test("reset clears the modelled filesystem and returns READY", async () => {
    const { provider, handle, fs } = await readyProvider();
    await provider.executeCommand({ handle, input: { kind: "raw-shell", data: "mkdir project" }, cwd: "", challengeRef: null });
    expect(fs.size).toBe(1);
    const reset = await provider.resetEnvironment(handle);
    expect(reset.ok).toBe(true);
    if (reset.ok) expect(reset.value.status).toBe("READY");
    expect(fs.size).toBe(0);
  });

  test("pause blocks execution until resume", async () => {
    const { provider, handle } = await readyProvider();
    await provider.pauseEnvironment(handle);
    const blocked = await provider.executeCommand({ handle, input: { kind: "raw-shell", data: "ls" }, cwd: "", challengeRef: null });
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.error.code).toBe("ENVIRONMENT_NOT_READY");
    await provider.resumeEnvironment(handle);
    const after = await provider.executeCommand({ handle, input: { kind: "raw-shell", data: "ls" }, cwd: "", challengeRef: null });
    expect(after.ok).toBe(true);
  });

  test("snapshot then restore round-trips a reference", async () => {
    const { provider, handle } = await readyProvider();
    const snap = await provider.snapshotEnvironment(handle);
    expect(snap.ok).toBe(true);
    if (!snap.ok) return;
    const restored = await provider.restoreEnvironment(handle, snap.value.snapshotId);
    expect(restored.ok).toBe(true);
    const bogus = await provider.restoreEnvironment(handle, "not-a-snapshot");
    expect(bogus.ok).toBe(false);
  });

  test("processes, services and environment variables report unsupported, not fiction", async () => {
    const { provider, handle } = await readyProvider();
    const [p, s, e] = await Promise.all([
      provider.getProcessState(handle),
      provider.getServiceState(handle),
      provider.getEnvironmentVariables(handle),
    ]);
    expect(p.ok && p.value.supported).toBe(false);
    expect(s.ok && s.value.supported).toBe(false);
    expect(e.ok && e.value.supported).toBe(false);
    if (e.ok) expect(Object.keys(e.value.variables)).toHaveLength(0);
  });
});

describe("story behaviour preserved", () => {
  test("C01→C05 style progression still mutates modelled state through the provider", async () => {
    const { provider, handle, fs } = await readyProvider();
    const steps = [
      "mkdir project",
      "mkdir project/logs",
      "touch project/logs/error.log",
      "for i in {1..3}; do touch project/logs/run$i.log; done",
      "chmod 750 project/logs",
    ];
    let cwd = "";
    for (const step of steps) {
      const res = await provider.executeCommand({ handle, input: { kind: "raw-shell", data: step }, cwd, challengeRef: "C0x" });
      expect(res.ok).toBe(true);
      if (res.ok) cwd = res.value.cwdAfter;
    }
    expect(fs.get("project")?.objectType).toBe("directory");
    expect(fs.get("project/logs")?.permissions).toBe("750");
    expect(fs.get("project/logs/error.log")?.objectType).toBe("file");
    expect(fs.get("project/logs/run3.log")).toBeDefined();

    const loop = await provider.executeCommand({
      handle,
      input: { kind: "raw-shell", data: "for i in {1..3}; do touch project/logs/x$i.log; done" },
      cwd: "",
      challengeRef: "C04",
    });
    expect(loop.ok).toBe(true);
    if (loop.ok) {
      expect(loop.value.method.usedLoopConstruct).toBe(true);
      expect(loop.value.method.invocations).toBe(1);
    }
  });
});
