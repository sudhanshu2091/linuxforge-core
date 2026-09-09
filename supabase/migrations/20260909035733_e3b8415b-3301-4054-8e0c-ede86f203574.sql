CREATE TABLE public.lab_instances (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lab_id uuid NOT NULL REFERENCES public.learner_labs(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'mock-modelled-v1',
  environment_id text NOT NULL,
  status text NOT NULL DEFAULT 'READY',
  snapshot_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  last_active_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone,
  CONSTRAINT lab_instances_status_check CHECK (status IN ('CREATING','READY','RUNNING','PAUSED','RESETTING','STOPPED','ERROR','EXPIRED')),
  CONSTRAINT lab_instances_provider_env_unique UNIQUE (provider, environment_id)
);

CREATE INDEX lab_instances_user_idx ON public.lab_instances (user_id);
CREATE INDEX lab_instances_user_lab_idx ON public.lab_instances (user_id, lab_id);

GRANT SELECT, INSERT, UPDATE ON public.lab_instances TO authenticated;
GRANT ALL ON public.lab_instances TO service_role;

ALTER TABLE public.lab_instances ENABLE ROW LEVEL SECURITY;

CREATE POLICY lab_instances_select_own ON public.lab_instances FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY lab_instances_insert_own ON public.lab_instances FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY lab_instances_update_own ON public.lab_instances FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER lab_instances_set_updated_at BEFORE UPDATE ON public.lab_instances FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.lab_command_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lab_instance_id uuid NOT NULL REFERENCES public.lab_instances(id) ON DELETE CASCADE,
  challenge_id text,
  provider text NOT NULL,
  input text NOT NULL,
  cwd_before text NOT NULL DEFAULT '',
  cwd_after text NOT NULL DEFAULT '',
  stdout text NOT NULL DEFAULT '',
  stderr text NOT NULL DEFAULT '',
  exit_code integer NOT NULL DEFAULT 0,
  duration_ms integer NOT NULL DEFAULT 0,
  blocked_reason text,
  state_change_ref jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX lab_command_events_user_idx ON public.lab_command_events (user_id, created_at DESC);
CREATE INDEX lab_command_events_instance_idx ON public.lab_command_events (lab_instance_id, created_at DESC);

GRANT SELECT, INSERT ON public.lab_command_events TO authenticated;
GRANT ALL ON public.lab_command_events TO service_role;

ALTER TABLE public.lab_command_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY lab_command_events_select_own ON public.lab_command_events FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY lab_command_events_insert_own ON public.lab_command_events FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);