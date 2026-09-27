import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/integrations/supabase/types";
import { createSupabaseAdminClient } from "@/integrations/supabase/server-admin";
import { createSupabaseMockStore } from "../sandbox/lab.server";
import { selectProvider } from "../sandbox/registry.server";
import type { EnvironmentHandle, EnvironmentPersistence } from "../sandbox/contract";
import { getEnvironmentPersistence } from "../sandbox/environment-persistence.server";
import { assertExerciseContract } from "./contract";
import { verifyExercise } from "./engine";
import { assertEvidenceCurrent } from "./snapshot";
import { classifyCompletionQuality } from "./verdict";
import { buildSemanticFingerprint } from "./semantic-identity";
import type { ExerciseContract, VerificationResult } from "./types";

type Db = SupabaseClient<Database>;

export async function verifyLabExercise(input: {
  db: Db;
  userId: string;
  labId: string;
  environmentId: string;
  attemptId?: string;
  contract: ExerciseContract;
  hintsUsed?: number;
  solutionRevealed?: boolean;
  tutorInterventionCount?: number;
}): Promise<VerificationResult> {
  assertExerciseContract(input.contract);
  const instance = await input.db
    .from("lab_instances")
    .select("*")
    .eq("user_id", input.userId)
    .eq("lab_id", input.labId)
    .eq("environment_id", input.environmentId)
    .maybeSingle();
  if (instance.error) throw new Error(instance.error.message);
  if (!instance.data) throw new Error("Lab environment not found for this learner.");
  const persistence = await getEnvironmentPersistence(input.db, input.userId, input.environmentId);
  if (!persistence) throw new Error("Persistent environment state not found.");
  if (persistence.state === "DESTROYED") throw new Error("Cannot verify a destroyed environment.");
  if (persistence.state === "QUARANTINED")
    throw new Error("Cannot verify a quarantined environment.");
  const handle: EnvironmentHandle = {
    provider: instance.data.provider as EnvironmentHandle["provider"],
    environmentId: input.environmentId,
    userId: input.userId,
    labId: input.labId,
  };
  const provider = selectProvider(createSupabaseMockStore(input.db, input.userId)).provider;
  const paths = input.contract.requirements
    .filter(
      (
        requirement,
      ): requirement is Extract<(typeof input.contract.requirements)[number], { path: string }> =>
        "path" in requirement,
    )
    .map((requirement) => ({
      path: requirement.path,
      includeContent: requirement.kind === "content",
    }));
  const inspection = await provider.inspectEnvironment(handle, paths);
  const descriptor = await provider.getEnvironmentState(handle);
  if (!inspection.ok) throw new Error(inspection.error.message);
  if (!descriptor.ok) throw new Error(descriptor.error.message);
  const runtimeLifecycleGeneration = Number(
    descriptor.value.metadata["lifecycleGeneration"] ?? NaN,
  );
  const evidence = {
    ...inspection.value,
    capturedAt: inspection.value.capturedAt,
    environmentId: handle.environmentId,
    environmentGeneration: persistence.environmentGeneration,
    runtimeId: null,
    runtimeLifecycleGeneration: Number.isFinite(runtimeLifecycleGeneration)
      ? runtimeLifecycleGeneration
      : null,
  };
  assertEvidenceCurrent({ evidence, environmentGeneration: persistence.environmentGeneration });
  const result = verifyExercise(input.contract, evidence);
  const hintsUsed = input.hintsUsed ?? 0;
  const solutionRevealed = input.solutionRevealed ?? false;
  const qualityInput = {
    verdict: result.verdict,
    hintsUsed,
    solutionRevealed,
  };
  const quality = classifyCompletionQuality(
    input.tutorInterventionCount === undefined
      ? qualityInput
      : { ...qualityInput, tutorInterventionCount: input.tutorInterventionCount },
  );
  await persistVerification({
    db: createSupabaseAdminClient(),
    userId: input.userId,
    labId: input.labId,
    attemptId: input.attemptId ?? null,
    contract: input.contract,
    persistence,
    result,
    quality,
    hintsUsed,
    solutionRevealed,
  });
  return result;
}

async function persistVerification(input: {
  db: Db;
  userId: string;
  labId: string;
  attemptId: string | null;
  contract: ExerciseContract;
  persistence: EnvironmentPersistence;
  result: VerificationResult;
  quality: ReturnType<typeof classifyCompletionQuality>;
  hintsUsed: number;
  solutionRevealed: boolean;
}): Promise<void> {
  const attemptId = input.attemptId ?? crypto.randomUUID();
  const attemptInsert = await input.db
    .from("lab_exercise_attempts")
    .insert({
      attempt_id: attemptId,
      user_id: input.userId,
      lab_id: input.labId,
      environment_id: input.result.evidence.environmentId,
      exercise_id: input.contract.exerciseId,
      question_id: input.contract.questionId ?? input.contract.exerciseId,
      question_variant_id: input.contract.questionVariantId ?? null,
      exercise_version: input.contract.version,
      semantic_fingerprint: buildSemanticFingerprint(input.contract),
      completion_mode: input.quality.mode,
      consumed: input.quality.consumed,
      hints_used: input.hintsUsed,
      solution_revealed: input.solutionRevealed,
      verdict: input.result.verdict,
    })
    .select("attempt_id")
    .single();

  let canonicalAttemptId = attemptId;
  if (attemptInsert.error) {
    if (attemptInsert.error.code !== "23505") throw new Error(attemptInsert.error.message);
    const existingAttempt = await input.db
      .from("lab_exercise_attempts")
      .select("attempt_id")
      .eq("attempt_id", attemptId)
      .eq("user_id", input.userId)
      .single();
    if (existingAttempt.error) throw new Error(existingAttempt.error.message);
    canonicalAttemptId = existingAttempt.data.attempt_id;
  }

  const verificationInsert = await input.db
    .from("lab_exercise_verifications")
    .insert({
      attempt_id: canonicalAttemptId,
      user_id: input.userId,
      environment_id: input.result.evidence.environmentId,
      environment_generation: input.persistence.environmentGeneration,
      runtime_lifecycle_generation: input.result.evidence.runtimeLifecycleGeneration,
      verifier_version: input.result.verifierVersion,
      contract_version: input.result.contractVersion,
      verdict: input.result.verdict,
      score: input.result.score,
      failure_classification: input.result.failureClassification,
      evidence: JSON.parse(JSON.stringify(input.result.evidence)) as Json,
    })
    .select("id")
    .single();

  let verificationId: number;
  if (verificationInsert.error) {
    if (verificationInsert.error.code !== "23505")
      throw new Error(verificationInsert.error.message);
    const existingVerification = await input.db
      .from("lab_exercise_verifications")
      .select("id")
      .eq("attempt_id", canonicalAttemptId)
      .eq("verifier_version", input.result.verifierVersion)
      .eq("contract_version", input.result.contractVersion)
      .single();
    if (existingVerification.error) throw new Error(existingVerification.error.message);
    verificationId = existingVerification.data.id;
  } else {
    verificationId = verificationInsert.data.id;
  }

  const requirements = input.result.requirements.map((requirement) => ({
    verification_id: verificationId,
    user_id: input.userId,
    requirement_id: requirement.requirementId,
    met: requirement.met,
    evidence: requirement.evidence,
    observed: JSON.parse(JSON.stringify(requirement.observed)) as Json,
  }));
  const inserted = await input.db.from("lab_exercise_requirement_results").upsert(requirements, {
    onConflict: "verification_id,requirement_id",
    ignoreDuplicates: true,
  });
  if (inserted.error) throw new Error(inserted.error.message);
}

export { buildSemanticFingerprint };
