import { describe, expect, it } from "vitest";
import type { Db } from "./terminal-control.server";
import { authorizeTerminalSession, createTerminalSession } from "./terminal-control.server";

type TestRow = {
  session_id: string;
  user_id: string;
  instance_id: string;
  runtime_id: string;
  lab_id: string;
  shell: string;
  cwd: string;
  state: string;
  binding_generation: number;
  runtime_lifecycle_generation: number;
  created_at: string;
  updated_at: string;
  last_seen_at: string | null;
  expires_at: string;
  closed_at: string | null;
};

type TestTable = {
  rows: TestRow[];
  select: () => TestTable;
  eq: () => TestTable;
  maybeSingle: () => Promise<{ data: TestRow | null; error: null }>;
  upsert: (value: TestRow) => TestTable;
  single: () => Promise<{ data: TestRow; error: null }>;
  update: (value: TestRow) => TestTable;
  in: () => TestTable;
  not: () => TestTable;
  insert: () => Promise<{ data: null; error: null }>;
};

function dbMock(rows: TestRow[] = []): Db {
  const table: TestTable = {
    rows,
    select: () => table,
    eq: () => table,
    maybeSingle: async () => ({ data: rows[0] ?? null, error: null }),
    upsert: (value) => {
      rows[0] = {
        session_id: value.session_id,
        user_id: value.user_id,
        instance_id: value.instance_id,
        runtime_id: value.runtime_id,
        lab_id: value.lab_id,
        shell: value.shell,
        cwd: value.cwd,
        state: value.state,
        binding_generation: value.binding_generation,
        runtime_lifecycle_generation: value.runtime_lifecycle_generation,
        created_at: "2026-09-20T00:00:00.000Z",
        updated_at: "2026-09-20T00:00:00.000Z",
        last_seen_at: value.last_seen_at,
        expires_at: value.expires_at,
        closed_at: null,
      };
      return table;
    },
    single: async () => {
      const row = rows[0];
      if (!row) throw new Error("Expected a test row.");
      return { data: row, error: null };
    },
    update: (value) => {
      if (rows[0]) Object.assign(rows[0], value);
      return table;
    },
    in: () => table,
    not: () => table,
    insert: async () => ({ data: null, error: null }),
  };

  return {
    from: () => table,
  } as unknown as Db;
}

describe("M3 terminal control plane", () => {
  it("creates and authorizes a runtime-scoped session", async () => {
    const db = dbMock();
    const session = await createTerminalSession({
      db,
      userId: "u1",
      instanceId: "i1",
      runtimeId: "r1",
      labId: "l1",
      sessionId: "s1",
      shell: "bash",
      cwd: "/home/linuxforge",
      bindingGeneration: 2,
      runtimeLifecycleGeneration: 7,
      eventDb: db,
    });
    expect(session.state).toBe("AUTHORIZED");
    await expect(
      authorizeTerminalSession({
        db,
        userId: "u1",
        sessionId: "s1",
        labId: "l1",
        runtimeId: "r1",
        bindingGeneration: 2,
        runtimeLifecycleGeneration: 7,
      }),
    ).resolves.toMatchObject({ sessionId: "s1" });
  });

  it("rejects stale runtime lifecycle generations", async () => {
    const db = dbMock();
    await createTerminalSession({
      db,
      userId: "u1",
      instanceId: "i1",
      runtimeId: "r1",
      labId: "l1",
      sessionId: "s1",
      shell: "bash",
      cwd: "/home/linuxforge",
      bindingGeneration: 2,
      runtimeLifecycleGeneration: 7,
      eventDb: db,
    });

    await expect(
      authorizeTerminalSession({
        db,
        userId: "u1",
        sessionId: "s1",
        labId: "l1",
        runtimeId: "r1",
        bindingGeneration: 2,
        runtimeLifecycleGeneration: 8,
      }),
    ).rejects.toThrow(/stale runtime lifecycle generation/i);
  });

  it("rejects a session rebound to another runtime", async () => {
    const db = dbMock();
    await createTerminalSession({
      db,
      userId: "u1",
      instanceId: "i1",
      runtimeId: "r1",
      labId: "l1",
      sessionId: "s1",
      shell: "bash",
      cwd: "/home/linuxforge",
      bindingGeneration: 2,
      runtimeLifecycleGeneration: 7,
      eventDb: db,
    });

    await expect(
      authorizeTerminalSession({
        db,
        userId: "u1",
        sessionId: "s1",
        labId: "l1",
        runtimeId: "r2",
        bindingGeneration: 2,
        runtimeLifecycleGeneration: 7,
      }),
    ).rejects.toThrow(/runtime mismatch/i);
  });
});
