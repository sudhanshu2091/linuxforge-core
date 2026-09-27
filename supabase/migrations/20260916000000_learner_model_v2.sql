-- LinuxForge learner model v2: multidimensional evidence beyond raw mastery.
ALTER TABLE public.learner_skill_memory
  ADD COLUMN IF NOT EXISTS retention integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS independence integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS speed_score integer NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS consistency integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS difficulty_rating numeric(3,1) NOT NULL DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS evidence_count integer NOT NULL DEFAULT 0;

ALTER TABLE public.learner_skill_memory
  ADD CONSTRAINT learner_skill_memory_retention_check CHECK (retention BETWEEN 0 AND 100),
  ADD CONSTRAINT learner_skill_memory_independence_check CHECK (independence BETWEEN 0 AND 100),
  ADD CONSTRAINT learner_skill_memory_speed_check CHECK (speed_score BETWEEN 0 AND 100),
  ADD CONSTRAINT learner_skill_memory_consistency_check CHECK (consistency BETWEEN 0 AND 100),
  ADD CONSTRAINT learner_skill_memory_difficulty_check CHECK (difficulty_rating BETWEEN 1 AND 5),
  ADD CONSTRAINT learner_skill_memory_evidence_count_check CHECK (evidence_count >= 0);

CREATE INDEX IF NOT EXISTS learner_skill_memory_user_mastery_idx
  ON public.learner_skill_memory (user_id, mastery DESC);
