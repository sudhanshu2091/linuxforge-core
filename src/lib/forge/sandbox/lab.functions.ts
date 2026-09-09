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

const LIFECYCLE_ACTIONS = ["get", "start", "reset", "snapshot", "restore", "pause", "resume", "destroy"] as const;
export type LifecycleAction = (typeof LIFECYCLE_ACTIONS)[number];

export type LabStatusResult = {
  status: SandboxStatusView;
  filesystem: FilesystemState;
  snapshotId: string | null;
  error: string | null;
};

export const labLifecycle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { action?: string; cwd?: string; snapshotId?: string }) => {
    const action = (LIFECYCLE_ACTIONS as readonly string[]).includes(data.action ?? "")
      ? (data.action as LifecycleAction)
      : "get";
    return { action, cwd: typeof data.cwd === "string" ? data.cwd : "", snapshotId: data.snapshotId ?? null };
  })
  .handler(async ({ data, context }): Promise<LabStatusResult> => {
    const lab = await import("./lab.server");
    const session = await lab.ensureLabSession(context.supabase, context.userId);
    if (!session.ok)
      throw new Error(`Lab environment unavailable (${session.error.code}): ${session.error.message}`);

    let error: string | null = null;
    let snapshotId = session.value.descriptor.snapshotId;

    switch (data.action) {
      case "reset": {
        const res = await lab.resetLab(session.value);
        if (!res.ok) error = res.error.message;
        break;
      }
      case "pause": {
        const res = await lab.pauseLab(session.value);
        if (!res.ok) error = res.error.message;
        break;
      }
      case "resume":
      case "start": {
        const res = await lab.resumeLab(session.value);
        if (!res.ok) error = res.error.message;
        break;
      }
      case "snapshot": {
        const res = await lab.snapshotLab(session.value);
        if (res.ok) snapshotId = res.value.snapshotId;
        else error = res.error.message;
        break;
      }
      case "restore": {
        if (!data.snapshotId) error = "No snapshot reference supplied.";
        else {
          const res = await lab.restoreLab(session.value, data.snapshotId);
          if (!res.ok) error = res.error.message;
        }
        break;
      }
      case "destroy": {
        const res = await lab.destroyLab(session.value);
        if (!res.ok) error = res.error.message;
        break;
      }
      case "get":
      default:
        break;
    }

    const state = await lab.labState(session.value);
    const fs = await lab.labFilesystem(session.value, data.cwd);
    const view = lab.statusView(session.value);

    return {
      status: state.ok ? { ...view, status: state.value.status } : { ...view, available: false, unavailableReason: state.error.message },
      filesystem: fs.ok ? fs.value : { root: "/home/learner", cwd: data.cwd, objects: [], modelled: true },
      snapshotId,
      error,
    };
  });
