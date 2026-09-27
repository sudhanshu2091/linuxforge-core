-- LinuxForge Phase 1 control-plane hardening.
-- Preserve historical/stopped instances while preventing multiple active
-- runtime records for one learner/lab/provider.
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, lab_id, provider
      ORDER BY last_active_at DESC, created_at DESC
    ) AS position
  FROM public.lab_instances
  WHERE status NOT IN ('STOPPED', 'EXPIRED')
)
UPDATE public.lab_instances AS instances
SET status = 'EXPIRED'
FROM ranked
WHERE instances.id = ranked.id
  AND ranked.position > 1;

CREATE UNIQUE INDEX IF NOT EXISTS lab_instances_user_lab_provider_active_uidx
  ON public.lab_instances (user_id, lab_id, provider)
  WHERE status NOT IN ('STOPPED', 'EXPIRED');

CREATE INDEX IF NOT EXISTS learner_challenge_attempts_user_updated_idx
  ON public.learner_challenge_attempts (user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS learner_skill_memory_user_review_idx
  ON public.learner_skill_memory (user_id, next_review);

CREATE INDEX IF NOT EXISTS learner_challenge_events_user_created_idx
  ON public.learner_challenge_events (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS lab_command_events_user_challenge_created_idx
  ON public.lab_command_events (user_id, challenge_id, created_at DESC);
