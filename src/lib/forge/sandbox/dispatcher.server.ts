import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  destroyLab,
  ensureLabSession,
  labState,
  pauseLab,
  resetLab,
  resumeLab,
  snapshotLab,
} from "./lab.server";
import type { LabJob } from "./scheduler";

export type DispatchResult = { ok: true } | { ok: false; error: string };

type Db = SupabaseClient<Database>;

/**
 * Single lifecycle dispatch boundary for workers.
 *
 * The worker never receives shell text and never chooses a provider. It only
 * carries a typed lifecycle job. Provider selection and authenticated lab
 * ownership stay inside lab.server.
 */
export async function dispatchLabJob(db: Db, job: LabJob): Promise<DispatchResult> {
  const session = await ensureLabSession(db, job.userId);
  if (!session.ok) return { ok: false, error: session.error.message };

  if (session.value.instanceId !== job.instanceId && job.kind !== "CREATE") {
    return { ok: false, error: "Lab job targets a stale or replaced instance." };
  }

  try {
    switch (job.kind) {
      case "CREATE":
      case "START":
      case "RESUME":
        if (job.kind !== "CREATE") {
          const result = await resumeLab(db, job.userId, session.value);
          if (!result.ok) return { ok: false, error: result.error.message };
        }
        return { ok: true };
      case "STOP":
      case "EXPIRE": {
        const result = await destroyLab(db, job.userId, session.value);
        return result.ok ? { ok: true } : { ok: false, error: result.error.message };
      }
      case "RESET": {
        const result = await resetLab(db, job.userId, session.value);
        return result.ok ? { ok: true } : { ok: false, error: result.error.message };
      }
      case "PAUSE": {
        const result = await pauseLab(db, job.userId, session.value);
        return result.ok ? { ok: true } : { ok: false, error: result.error.message };
      }
      case "RECONCILE": {
        const result = await labState(db, job.userId, session.value);
        return result.ok ? { ok: true } : { ok: false, error: result.error.message };
      }
      case "SNAPSHOT": {
        const result = await snapshotLab(db, job.userId, session.value);
        return result.ok ? { ok: true } : { ok: false, error: result.error.message };
      }
    }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
