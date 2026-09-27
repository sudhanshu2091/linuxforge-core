-- Phase 2: runtime supervision. The supervisor only schedules typed jobs; it
-- never executes a provider operation itself.

CREATE OR REPLACE FUNCTION public.list_lab_supervision_candidates(
  p_now timestamptz DEFAULT now(),
  p_reconcile_after_seconds integer DEFAULT 60,
  p_limit integer DEFAULT 100
)
RETURNS SETOF public.lab_instances
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'internal worker role required';
  END IF;
  IF p_reconcile_after_seconds < 1 OR p_limit < 1 OR p_limit > 500 THEN
    RAISE EXCEPTION 'invalid supervision policy';
  END IF;

  RETURN QUERY
  SELECT li.*
  FROM public.lab_instances li
  WHERE li.status NOT IN ('STOPPED', 'EXPIRED')
    AND (
      (li.expires_at IS NOT NULL AND li.expires_at <= p_now)
      OR li.last_active_at <= p_now - make_interval(secs => p_reconcile_after_seconds)
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.lab_jobs j
      WHERE j.instance_id = li.id
        AND j.status IN ('QUEUED', 'RUNNING')
    )
  ORDER BY
    CASE WHEN li.expires_at IS NOT NULL AND li.expires_at <= p_now THEN 0 ELSE 1 END,
    li.last_active_at ASC,
    li.id ASC
  LIMIT p_limit;
END;
$$;

CREATE OR REPLACE FUNCTION public.enqueue_expire_lab_job(
  p_instance_id uuid,
  p_user_id uuid,
  p_now timestamptz DEFAULT now()
)
RETURNS SETOF public.lab_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job public.lab_jobs;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'internal worker role required';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.lab_instances
    WHERE id = p_instance_id
      AND user_id = p_user_id
      AND status NOT IN ('STOPPED', 'EXPIRED')
      AND expires_at IS NOT NULL
      AND expires_at <= p_now
  ) THEN
    RETURN;
  END IF;

  INSERT INTO public.lab_jobs (
    id, instance_id, user_id, kind, status, priority, max_attempts, available_at, created_at
  )
  VALUES (
    gen_random_uuid(), p_instance_id, p_user_id, 'EXPIRE', 'QUEUED', -90, 3, p_now, p_now
  )
  ON CONFLICT (instance_id) WHERE status IN ('QUEUED', 'RUNNING')
  DO NOTHING
  RETURNING * INTO v_job;

  IF FOUND THEN RETURN NEXT v_job; END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.list_lab_supervision_candidates(timestamptz, integer, integer)
  FROM PUBLIC, authenticated, anon;
REVOKE ALL ON FUNCTION public.enqueue_expire_lab_job(uuid, uuid, timestamptz)
  FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.list_lab_supervision_candidates(timestamptz, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.enqueue_expire_lab_job(uuid, uuid, timestamptz) TO service_role;
