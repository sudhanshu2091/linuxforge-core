CREATE TYPE public.linux_comfort_level AS ENUM ('Total beginner', 'Some terminal time', 'Comfortable, want depth');
CREATE TYPE public.tutor_language AS ENUM ('English', 'Hinglish', 'Mix both');

CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TABLE public.learner_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  email TEXT NOT NULL,
  avatar_ref TEXT,
  linux_comfort_level public.linux_comfort_level NOT NULL DEFAULT 'Total beginner',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.learner_profiles TO authenticated;
GRANT ALL ON public.learner_profiles TO service_role;
ALTER TABLE public.learner_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "learner_profiles_select_own" ON public.learner_profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "learner_profiles_insert_own" ON public.learner_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "learner_profiles_update_own" ON public.learner_profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER learner_profiles_set_updated_at BEFORE UPDATE ON public.learner_profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.learner_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  preferred_tutor_language public.tutor_language NOT NULL DEFAULT 'Mix both',
  notify_daily_drill BOOLEAN NOT NULL DEFAULT true,
  notify_streak_risk BOOLEAN NOT NULL DEFAULT true,
  notify_squad_activity BOOLEAN NOT NULL DEFAULT true,
  notify_achievements BOOLEAN NOT NULL DEFAULT true,
  notify_email_digest BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.learner_preferences TO authenticated;
GRANT ALL ON public.learner_preferences TO service_role;
ALTER TABLE public.learner_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "learner_preferences_select_own" ON public.learner_preferences FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "learner_preferences_insert_own" ON public.learner_preferences FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "learner_preferences_update_own" ON public.learner_preferences FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER learner_preferences_set_updated_at BEFORE UPDATE ON public.learner_preferences FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();