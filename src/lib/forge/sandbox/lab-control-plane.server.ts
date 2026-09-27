/** V44 durable operation adapter. No provider calls live here. */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { providerFail, type ProviderResult } from "./contract";
import type { LabControlOperation, LabControlOperationKind } from "./lab-control-plane";

export type Db = SupabaseClient<Database>;

type OperationRow = Database["public"]["Tables"]["lab_control_operations"]["Row"];

const toOperation = (row: OperationRow): LabControlOperation => ({
  operationId: row.id,
  idempotencyKey: row.idempotency_key,
  instanceId: row.instance_id,
  userId: row.user_id,
  kind: row.kind as LabControlOperationKind,
  status: row.status as LabControlOperation["status"],
  attempt: row.attempt,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  leaseUntil: row.lease_until,
  workerId: row.worker_id,
  resultRef: row.result_ref,
  error: row.error,
});

export async function beginLabControlOperation(
  db: Db,
  userId: string,
  instanceId: string,
  kind: LabControlOperationKind,
  idempotencyKey?: string,
): Promise<LabControlOperation> {
  if (!userId || !instanceId) throw new Error("Lab operation ownership is required.");
  const key = (idempotencyKey?.trim() || crypto.randomUUID()).slice(0, 200);
  const existing = await db
    .from("lab_control_operations")
    .select("*")
    .eq("user_id", userId)
    .eq("idempotency_key", key)
    .maybeSingle();
  if (existing.error) throw new Error(existing.error.message);
  if (existing.data) {
    const op = toOperation(existing.data);
    if (op.instanceId !== instanceId || op.kind !== kind)
      throw new Error("Idempotency key is already bound to another lab operation.");
    return op;
  }
  const created = await db
    .from("lab_control_operations")
    .insert({
      id: crypto.randomUUID(),
      instance_id: instanceId,
      user_id: userId,
      kind,
      idempotency_key: key,
    })
    .select("*")
    .single();
  if (!created.error) return toOperation(created.data);
  if (created.error.code !== "23505") throw new Error(created.error.message);
  const raced = await db
    .from("lab_control_operations")
    .select("*")
    .eq("user_id", userId)
    .eq("idempotency_key", key)
    .single();
  if (raced.error) throw new Error(raced.error.message);
  const op = toOperation(raced.data);
  if (op.instanceId !== instanceId || op.kind !== kind)
    throw new Error("Idempotency key is already bound to another lab operation.");
  return op;
}

async function updateOperation(
  db: Db,
  userId: string,
  operationId: string,
  patch: Database["public"]["Tables"]["lab_control_operations"]["Update"],
): Promise<LabControlOperation> {
  const result = await db
    .from("lab_control_operations")
    .update(patch)
    .eq("id", operationId)
    .eq("user_id", userId)
    .select("*")
    .single();
  if (result.error) throw new Error(result.error.message);
  return toOperation(result.data);
}

export async function markLabOperationRunning(
  db: Db,
  userId: string,
  operationId: string,
  workerId = "request",
) {
  return updateOperation(db, userId, operationId, {
    status: "RUNNING",
    attempt: Math.max(1, (await getLabControlOperation(db, userId, operationId))?.attempt ?? 0) + 1,
    worker_id: workerId,
    lease_until: new Date(Date.now() + 60_000).toISOString(),
  });
}

export async function completeLabControlOperation(
  db: Db,
  userId: string,
  operationId: string,
  resultRef: string | null = null,
) {
  return updateOperation(db, userId, operationId, {
    status: "SUCCEEDED",
    lease_until: null,
    worker_id: null,
    result_ref: resultRef,
    error: null,
  });
}

export async function failLabControlOperation(
  db: Db,
  userId: string,
  operationId: string,
  error: string,
) {
  return updateOperation(db, userId, operationId, {
    status: "FAILED",
    lease_until: null,
    worker_id: null,
    error: error.slice(0, 2000),
  });
}

export async function runTrackedLabOperation<T>(
  db: Db,
  userId: string,
  instanceId: string,
  kind: LabControlOperationKind,
  idempotencyKey: string | undefined,
  operation: (operationId: string) => Promise<ProviderResult<T>>,
): Promise<ProviderResult<T> & { operationId: string }> {
  const tracked = await beginLabControlOperation(db, userId, instanceId, kind, idempotencyKey);
  if (tracked.status === "SUCCEEDED") {
    return {
      ...providerFail(
        "INTERNAL",
        "This idempotent lab operation has already completed; fetch its recorded operation result.",
        false,
      ),
      operationId: tracked.operationId,
    };
  }
  if (tracked.status === "RUNNING") {
    return {
      ...providerFail(
        "INTERNAL",
        "This lab operation is already running; wait for its lease or reconcile it before retrying.",
        true,
      ),
      operationId: tracked.operationId,
    };
  }
  if (tracked.status === "UNKNOWN") {
    return {
      ...providerFail(
        "INTERNAL",
        "This lab operation is UNKNOWN and requires runtime reconciliation before it can be retried.",
        true,
      ),
      operationId: tracked.operationId,
    };
  }
  await markLabOperationRunning(db, userId, tracked.operationId);
  try {
    const result = await operation(tracked.operationId);
    if (result.ok) {
      const resultRecord = result.value as unknown as Record<string, unknown>;
      const resultRef =
        typeof resultRecord["snapshotId"] === "string" ? resultRecord["snapshotId"] : null;
      await completeLabControlOperation(db, userId, tracked.operationId, resultRef);
    } else await failLabControlOperation(db, userId, tracked.operationId, result.error.message);
    return { ...result, operationId: tracked.operationId };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await failLabControlOperation(db, userId, tracked.operationId, message);
    throw error;
  }
}

export async function getLabControlOperation(
  db: Db,
  userId: string,
  operationId: string,
): Promise<LabControlOperation | null> {
  const result = await db
    .from("lab_control_operations")
    .select("*")
    .eq("id", operationId)
    .eq("user_id", userId)
    .maybeSingle();
  if (result.error) throw new Error(result.error.message);
  return result.data ? toOperation(result.data) : null;
}

export async function listLabControlOperations(
  db: Db,
  userId: string,
  instanceId: string,
  limit = 20,
): Promise<LabControlOperation[]> {
  const safeLimit = Math.min(100, Math.max(1, Math.trunc(limit)));
  const result = await db
    .from("lab_control_operations")
    .select("*")
    .eq("user_id", userId)
    .eq("instance_id", instanceId)
    .order("created_at", { ascending: false })
    .limit(safeLimit);
  if (result.error) throw new Error(result.error.message);
  return (result.data ?? []).map(toOperation);
}
