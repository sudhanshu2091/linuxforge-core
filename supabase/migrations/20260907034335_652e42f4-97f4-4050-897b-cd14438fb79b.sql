-- ============ challenge definitions (shared catalogue) ============
CREATE TABLE public.challenge_definitions (
  id text PRIMARY KEY,
  sequence_order integer NOT NULL,
  title text NOT NULL,
  story_intro text NOT NULL,
  objective text NOT NULL,
  required_skills text[] NOT NULL DEFAULT '{}',
  difficulty integer NOT NULL DEFAULT 1,
  prerequisites text[] NOT NULL DEFAULT '{}',
  xp_reward integer NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.challenge_definitions TO authenticated;
GRANT ALL ON public.challenge_definitions TO service_role;
ALTER TABLE public.challenge_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY challenge_definitions_read ON public.challenge_definitions
  FOR SELECT TO authenticated USING (true);
CREATE TRIGGER challenge_definitions_set_updated_at BEFORE UPDATE ON public.challenge_definitions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.challenge_definitions
  (id, sequence_order, title, story_intro, objective, required_skills, difficulty, prerequisites, xp_reward)
VALUES
  ('C01', 1, 'Claim your workspace',
   'You have just joined the Forge crew. Before anything else, every operator carves out their own project space on the box.',
   'Create a directory named project in your home directory.',
   ARRAY['filesystem'], 1, ARRAY[]::text[], 120),
  ('C02', 2, 'Somewhere to keep the noise',
   'Your first service is about to start writing output. The crew keeps logs out of the way, in their own folder inside the project.',
   'Create a directory named logs inside project.',
   ARRAY['filesystem'], 1, ARRAY['C01'], 140),
  ('C03', 3, 'The first log file',
   'The service needs a place to write failures. Create the error log the crew expects to find.',
   'Create an empty file error.log inside project/logs.',
   ARRAY['filesystem'], 2, ARRAY['C02'], 160),
  ('C04', 4, 'Rotate without repeating yourself',
   'Ops wants five rotated log slots ready. Typing the same command five times is not how the crew works — let the shell repeat for you.',
   'Create app1.log through app5.log inside project/logs using a shell loop.',
   ARRAY['iteration','shell-scripting'], 3, ARRAY['C03'], 220),
  ('C05', 5, 'Lock down the logs',
   'An audit is coming. Those logs you created earlier are readable by anyone on the box. Time to go back and secure the directory you built.',
   'Set project/logs to 750 and project/logs/error.log to 640.',
   ARRAY['permissions'], 3, ARRAY['C03'], 240);

-- ============ learner labs ============
CREATE TABLE public.learner_labs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lab_key text NOT NULL DEFAULT 'forge-core',
  title text NOT NULL DEFAULT 'Forge training lab',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, lab_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.learner_labs TO authenticated;
GRANT ALL ON public.learner_labs TO service_role;
ALTER TABLE public.learner_labs ENABLE ROW LEVEL SECURITY;
CREATE POLICY learner_labs_select_own ON public.learner_labs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY learner_labs_insert_own ON public.learner_labs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY learner_labs_update_own ON public.learner_labs FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY learner_labs_delete_own ON public.learner_labs FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER learner_labs_set_updated_at BEFORE UPDATE ON public.learner_labs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ modeled world objects ============
CREATE TABLE public.lab_world_objects (
  object_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lab_id uuid NOT NULL REFERENCES public.learner_labs(id) ON DELETE CASCADE,
  object_type text NOT NULL,
  path text NOT NULL,
  name text NOT NULL,
  created_by_challenge text,
  current_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_modified_by_challenge text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, lab_id, path)
);
CREATE INDEX lab_world_objects_user_lab_idx ON public.lab_world_objects (user_id, lab_id, active);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lab_world_objects TO authenticated;
GRANT ALL ON public.lab_world_objects TO service_role;
ALTER TABLE public.lab_world_objects ENABLE ROW LEVEL SECURITY;
CREATE POLICY lab_world_objects_select_own ON public.lab_world_objects FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY lab_world_objects_insert_own ON public.lab_world_objects FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY lab_world_objects_update_own ON public.lab_world_objects FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY lab_world_objects_delete_own ON public.lab_world_objects FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER lab_world_objects_set_updated_at BEFORE UPDATE ON public.lab_world_objects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ narrative events ============
CREATE TABLE public.learning_narrative_events (
  event_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_id text,
  event_type text NOT NULL,
  summary text NOT NULL,
  related_object_ids uuid[] NOT NULL DEFAULT '{}',
  related_skill_ids text[] NOT NULL DEFAULT '{}',
  importance integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX learning_narrative_events_user_idx ON public.learning_narrative_events (user_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.learning_narrative_events TO authenticated;
GRANT ALL ON public.learning_narrative_events TO service_role;
ALTER TABLE public.learning_narrative_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY narrative_select_own ON public.learning_narrative_events FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY narrative_insert_own ON public.learning_narrative_events FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY narrative_delete_own ON public.learning_narrative_events FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ skill memory ============
CREATE TABLE public.learner_skill_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  skill_id text NOT NULL,
  mastery integer NOT NULL DEFAULT 0,
  attempts integer NOT NULL DEFAULT 0,
  successful_attempts integer NOT NULL DEFAULT 0,
  recent_score integer,
  recent_mistakes text[] NOT NULL DEFAULT '{}',
  hint_dependency integer NOT NULL DEFAULT 0,
  last_practiced timestamptz,
  next_review timestamptz,
  confidence integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, skill_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.learner_skill_memory TO authenticated;
GRANT ALL ON public.learner_skill_memory TO service_role;
ALTER TABLE public.learner_skill_memory ENABLE ROW LEVEL SECURITY;
CREATE POLICY skill_memory_select_own ON public.learner_skill_memory FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY skill_memory_insert_own ON public.learner_skill_memory FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY skill_memory_update_own ON public.learner_skill_memory FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER learner_skill_memory_set_updated_at BEFORE UPDATE ON public.learner_skill_memory
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ challenge attempts ============
CREATE TABLE public.learner_challenge_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_id text NOT NULL,
  status text NOT NULL DEFAULT 'INCOMPLETE',
  attempts integer NOT NULL DEFAULT 0,
  best_score integer NOT NULL DEFAULT 0,
  xp_awarded integer NOT NULL DEFAULT 0,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, challenge_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.learner_challenge_attempts TO authenticated;
GRANT ALL ON public.learner_challenge_attempts TO service_role;
ALTER TABLE public.learner_challenge_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY attempts_select_own ON public.learner_challenge_attempts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY attempts_insert_own ON public.learner_challenge_attempts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY attempts_update_own ON public.learner_challenge_attempts FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER learner_challenge_attempts_set_updated_at BEFORE UPDATE ON public.learner_challenge_attempts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ challenge events (commands, observations, hints, verdicts) ============
CREATE TABLE public.learner_challenge_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_id text NOT NULL,
  kind text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX learner_challenge_events_idx ON public.learner_challenge_events (user_id, challenge_id, created_at);
GRANT SELECT, INSERT, DELETE ON public.learner_challenge_events TO authenticated;
GRANT ALL ON public.learner_challenge_events TO service_role;
ALTER TABLE public.learner_challenge_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY challenge_events_select_own ON public.learner_challenge_events FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY challenge_events_insert_own ON public.learner_challenge_events FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY challenge_events_delete_own ON public.learner_challenge_events FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ hint usage ============
CREATE TABLE public.learner_hint_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_id text NOT NULL,
  hint_level integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, challenge_id, hint_level)
);
GRANT SELECT, INSERT, DELETE ON public.learner_hint_usage TO authenticated;
GRANT ALL ON public.learner_hint_usage TO service_role;
ALTER TABLE public.learner_hint_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY hint_usage_select_own ON public.learner_hint_usage FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY hint_usage_insert_own ON public.learner_hint_usage FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY hint_usage_delete_own ON public.learner_hint_usage FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ progression ============
CREATE TABLE public.learner_progression (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  total_xp integer NOT NULL DEFAULT 0,
  level integer NOT NULL DEFAULT 1,
  labs_completed integer NOT NULL DEFAULT 0,
  challenges_completed integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.learner_progression TO authenticated;
GRANT ALL ON public.learner_progression TO service_role;
ALTER TABLE public.learner_progression ENABLE ROW LEVEL SECURITY;
CREATE POLICY progression_select_own ON public.learner_progression FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY progression_insert_own ON public.learner_progression FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY progression_update_own ON public.learner_progression FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER learner_progression_set_updated_at BEFORE UPDATE ON public.learner_progression
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();