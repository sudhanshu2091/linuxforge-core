-- LinuxForge Phase 2: lab lease + lifecycle control-plane primitives.
-- The lease is deliberately separate from provider credentials. It lets a future
-- scheduler safely decide which worker owns an active environment without giving
-- the worker learner data access.

ALTER TABLE public.lab_instances
  ADD COLUMN IF NOT EXISTS lease_token_hash text,
  ADD COLUMN IF NOT EXISTS lease_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_heartbeat_at timestamptz;

CREATE INDEX IF NOT EXISTS lab_instances_lease_expiry_idx
  ON public.lab_instances (lease_expires_at)
  WHERE status NOT IN ('STOPPED', 'EXPIRED');

CREATE OR REPLACE FUNCTION public.claim_lab_instance_lease(
  p_instance_id uuid,
  p_user_id uuid,
  p_lease_token_hash text,
  p_lease_seconds integer DEFAULT 60
)
RETURNS TABLE (
  id uuid,
  status text,
  lease_expires_at timestamptz,
  last_heartbeat_at timestamptz
)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_now timestamptz := now();
BEGIN
  IF p_lease_seconds < 15 OR p_lease_seconds > 300 THEN
    RAISE EXCEPTION 'lease duration must be between 15 and 300 seconds';
  END IF;

  RETURN QUERY
  UPDATE public.lab_instances AS li
  SET lease_token_hash = p_lease_token_hash,
      lease_expires_at = v_now + make_interval(secs => p_lease_seconds),
      last_heartbeat_at = v_now,
      last_active_at = v_now
  WHERE li.id = p_instance_id
    AND li.user_id = p_user_id
    AND li.status NOT IN ('STOPPED', 'EXPIRED')
    AND (
      li.lease_expires_at IS NULL
      OR li.lease_expires_at <= v_now
      OR li.lease_token_hash = p_lease_token_hash
    )
  RETURNING li.id, li.status, li.lease_expires_at, li.last_heartbeat_at;
END;
$$;

CREATE OR REPLACE FUNCTION public.heartbeat_lab_instance_lease(
  p_instance_id uuid,
  p_user_id uuid,
  p_lease_token_hash text,
  p_lease_seconds integer DEFAULT 60
)
RETURNS TABLE (
  id uuid,
  status text,
  lease_expires_at timestamptz,
  last_heartbeat_at timestamptz
)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_now timestamptz := now();
BEGIN
  IF p_lease_seconds < 15 OR p_lease_seconds > 300 THEN
    RAISE EXCEPTION 'lease duration must be between 15 and 300 seconds';
  END IF;

  RETURN QUERY
  UPDATE public.lab_instances AS li
  SET lease_expires_at = v_now + make_interval(secs => p_lease_seconds),
      last_heartbeat_at = v_now,
      last_active_at = v_now
  WHERE li.id = p_instance_id
    AND li.user_id = p_user_id
    AND li.status NOT IN ('STOPPED', 'EXPIRED')
    AND li.lease_token_hash = p_lease_token_hash
    AND li.lease_expires_at > v_now
  RETURNING li.id, li.status, li.lease_expires_at, li.last_heartbeat_at;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_lab_instance_lease(
  p_instance_id uuid,
  p_user_id uuid,
  p_lease_token_hash text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  UPDATE public.lab_instances AS li
  SET lease_token_hash = NULL,
      lease_expires_at = NULL
  WHERE li.id = p_instance_id
    AND li.user_id = p_user_id
    AND li.lease_token_hash = p_lease_token_hash;
  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_lab_instance_lease(uuid, uuid, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.heartbeat_lab_instance_lease(uuid, uuid, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.release_lab_instance_lease(uuid, uuid, text) TO authenticated;
