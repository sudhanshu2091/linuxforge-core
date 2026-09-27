-- ============ learner-owned AI generated exercises ============
-- Generated content is persisted so a learner can resume the exact exercise,
-- and terminal missions can be evaluated against a machine-readable plan.
CREATE TABLE public.generated_exercises (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('question','task','mission','mock_exam')),
  title text NOT NULL,
  definition jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX generated_exercises_user_created_idx
  ON public.generated_exercises (user_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.generated_exercises TO authenticated;
GRANT ALL ON public.generated_exercises TO service_role;
ALTER TABLE public.generated_exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY generated_exercises_select_own ON public.generated_exercises
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY generated_exercises_insert_own ON public.generated_exercises
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY generated_exercises_update_own ON public.generated_exercises
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY generated_exercises_delete_own ON public.generated_exercises
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER generated_exercises_set_updated_at BEFORE UPDATE ON public.generated_exercises
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
