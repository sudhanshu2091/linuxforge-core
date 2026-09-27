import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  createLearnerIntelligenceSnapshot,
  snapshotSummary,
  type LearnerIntelligenceSnapshot,
} from "./learner-intelligence-snapshot";
import type { SkillMemoryView } from "@/lib/forge/types";
import { appendNarrativeEvent } from "@/lib/forge/persistence.server";

type Db = SupabaseClient<Database>;

/** Persist the derived intelligence as an auditable learner event. The source
 * skill rows remain authoritative; the snapshot is a materialized view that can
 * be rebuilt at any time, preventing stale intelligence from becoming truth. */
export async function persistLearnerIntelligence(
  db: Db,
  userId: string,
  skills: readonly SkillMemoryView[],
  recentMistakes: readonly string[] = [],
): Promise<LearnerIntelligenceSnapshot> {
  const snapshot = createLearnerIntelligenceSnapshot(skills, recentMistakes);
  await appendNarrativeEvent(db, {
    userId,
    challengeId: null,
    eventType: "LEARNER_INTELLIGENCE_SNAPSHOT_V31",
    summary: snapshotSummary(snapshot),
    relatedSkillIds: snapshot.focusSkills,
    importance: 1,
  });
  return snapshot;
}
