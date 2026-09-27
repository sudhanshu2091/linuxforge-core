/**
 * Authenticated lab lifecycle server functions.
 *
 * These are the ONLY client-reachable lab endpoints, and none of them is a
 * generic shell endpoint: the caller names a lifecycle action, never a provider
 * or a host command. Learner command execution stays inside the mission flow
 * (`engine.functions.ts` → `executeInLab`).
 */

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { FilesystemState, SandboxStatusView } from "./contract";

const LIFECYCLE_ACTIONS = [
  "get",
  "start",
  "reset",
  "snapshot",
  "restore",
  "pause",
  "resume",
  "destroy",
] as const;
export type LifecycleAction = (typeof LIFECYCLE_ACTIONS)[number];

export type LabStatusResult = {
  status: SandboxStatusView;
  filesystem: FilesystemState;
  snapshotId: string | null;
  error: string | null;
  operationId: string | null;
};

export const labLifecycle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (data: { action?: string; cwd?: string; snapshotId?: string; idempotencyKey?: string }) => {
      const action = (LIFECYCLE_ACTIONS as readonly string[]).includes(data.action ?? "")
        ? (data.action as LifecycleAction)
        : "get";
      return {
        action,
        cwd: typeof data.cwd === "string" ? data.cwd : "",
        snapshotId: data.snapshotId ?? null,
        idempotencyKey:
          typeof data.idempotencyKey === "string" ? data.idempotencyKey.slice(0, 200) : undefined,
      };
    },
  )
  .handler(async ({ data, context }): Promise<LabStatusResult> => {
    const lab = await import("./lab.server");
    const session = await lab.ensureLabSession(context.supabase, context.userId);
    if (!session.ok)
      throw new Error(
        `Lab environment unavailable (${session.error.code}): ${session.error.message}`,
      );

    let error: string | null = null;
    let snapshotId = session.value.descriptor.snapshotId;
    let operationId: string | null = null;

    switch (data.action) {
      case "reset": {
        const res = await lab.resetLab(
          context.supabase,
          context.userId,
          session.value,
          data.idempotencyKey,
        );
        if (!res.ok) error = res.error.message;
        else
          operationId =
            "operationId" in res && typeof res.operationId === "string" ? res.operationId : null;
        break;
      }
      case "pause": {
        const res = await lab.pauseLab(
          context.supabase,
          context.userId,
          session.value,
          data.idempotencyKey,
        );
        if (!res.ok) error = res.error.message;
        else
          operationId =
            "operationId" in res && typeof res.operationId === "string" ? res.operationId : null;
        break;
      }
      case "resume":
      case "start": {
        const res = await lab.resumeLab(
          context.supabase,
          context.userId,
          session.value,
          data.idempotencyKey,
        );
        if (!res.ok) error = res.error.message;
        else
          operationId =
            "operationId" in res && typeof res.operationId === "string" ? res.operationId : null;
        break;
      }
      case "snapshot": {
        const res = await lab.snapshotLab(
          context.supabase,
          context.userId,
          session.value,
          data.idempotencyKey,
        );
        if (res.ok) {
          snapshotId = res.value.snapshotId;
          operationId =
            "operationId" in res && typeof res.operationId === "string" ? res.operationId : null;
        } else error = res.error.message;
        break;
      }
      case "restore": {
        if (!data.snapshotId) error = "No snapshot reference supplied.";
        else {
          const res = await lab.restoreLab(
            context.supabase,
            context.userId,
            session.value,
            data.snapshotId,
            data.idempotencyKey,
          );
          if (!res.ok) error = res.error.message;
          else
            operationId =
              "operationId" in res && typeof res.operationId === "string" ? res.operationId : null;
        }
        break;
      }
      case "destroy": {
        const res = await lab.destroyLab(
          context.supabase,
          context.userId,
          session.value,
          data.idempotencyKey,
        );
        if (!res.ok) error = res.error.message;
        else
          operationId =
            "operationId" in res && typeof res.operationId === "string" ? res.operationId : null;
        break;
      }
      case "get":
      default:
        break;
    }

    const state = await lab.labState(context.supabase, context.userId, session.value);
    const fs = await lab.labFilesystem(context.supabase, context.userId, session.value, data.cwd);
    const view = lab.statusView(session.value);

    return {
      status: state.ok
        ? { ...view, status: state.value.status }
        : { ...view, available: false, unavailableReason: state.error.message },
      filesystem: fs.ok
        ? fs.value
        : { root: "/home/learner", cwd: data.cwd, objects: [], modelled: true },
      snapshotId,
      error,
      operationId,
    };
  });

export const acquireLabLease = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { instanceId: string; leaseSeconds?: number }) => {
    if (!data.instanceId) throw new Error("Lab instance is required.");
    const leaseSeconds = Math.min(300, Math.max(15, Math.trunc(data.leaseSeconds ?? 60)));
    return { instanceId: data.instanceId, leaseSeconds };
  })
  .handler(async ({ data, context }) => {
    const { claimLabLease } = await import("./orchestrator.server");
    const lease = await claimLabLease(
      context.supabase,
      context.userId,
      data.instanceId,
      data.leaseSeconds,
    );
    if (!lease) throw new Error("Lab instance is unavailable or already leased.");
    return lease;
  });

export const heartbeatLabLease = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { instanceId: string; token: string; leaseSeconds?: number }) => {
    if (!data.instanceId || !data.token) throw new Error("Lab lease is required.");
    if (data.token.length > 256) throw new Error("Invalid lab lease token.");
    const leaseSeconds = Math.min(300, Math.max(15, Math.trunc(data.leaseSeconds ?? 60)));
    return { instanceId: data.instanceId, token: data.token, leaseSeconds };
  })
  .handler(async ({ data, context }) => {
    const { heartbeatLabLease } = await import("./orchestrator.server");
    const lease = await heartbeatLabLease(
      context.supabase,
      context.userId,
      {
        instanceId: data.instanceId,
        token: data.token,
        expiresAt: "",
        heartbeatAt: "",
      },
      data.leaseSeconds,
    );
    if (!lease) throw new Error("Lab lease expired or is no longer owned.");
    return lease;
  });

export const releaseLabLease = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { instanceId: string; token: string }) => {
    if (!data.instanceId || !data.token) throw new Error("Lab lease is required.");
    if (data.token.length > 256) throw new Error("Invalid lab lease token.");
    return data;
  })
  .handler(async ({ data, context }) => {
    const { releaseLabLease } = await import("./orchestrator.server");
    return {
      released: await releaseLabLease(context.supabase, context.userId, {
        instanceId: data.instanceId,
        token: data.token,
        expiresAt: "",
        heartbeatAt: "",
      }),
    };
  });

export const getLabOperation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { operationId: string }) => {
    if (!data.operationId) throw new Error("Lab operation is required.");
    return { operationId: data.operationId };
  })
  .handler(async ({ data, context }) => {
    const { getLabControlOperation } = await import("./lab-control-plane.server");
    return getLabControlOperation(context.supabase, context.userId, data.operationId);
  });

export const listLabOperations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { instanceId: string; limit?: number }) => {
    if (!data.instanceId) throw new Error("Lab instance is required.");
    return { instanceId: data.instanceId, limit: data.limit ?? 20 };
  })
  .handler(async ({ data, context }) => {
    const { listLabControlOperations } = await import("./lab-control-plane.server");
    return listLabControlOperations(context.supabase, context.userId, data.instanceId, data.limit);
  });
