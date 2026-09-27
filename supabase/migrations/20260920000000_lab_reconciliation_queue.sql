-- Phase 2: reconciliation scheduling.
-- Enqueue a low-priority reconciliation job only when the instance has no
-- active lifecycle job. This is intentionally atomic so multiple scheduler
-- ticks cannot create duplicate reconciliation work.

CREATE OR REPLACE FUNCTION public.enqueue_reconcile_lab_job(
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
    WHERE id = p_instance_id AND user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'lab instance does not belong to learner';
  END IF;

  INSERT INTO public.lab_jobs (
    id,
    instance_id,
    user_id,
    kind,
    status,
    priority,
    max_attempts,
    available_at,
    created_at
  )
  VALUES (
    gen_random_uuid(),
    p_instance_id,
    p_user_id,
    'RECONCILE',
    'QUEUED',
    -100,
    3,
    p_now,
    p_now
  )
  ON CONFLICT (instance_id) WHERE status IN ('QUEUED', 'RUNNING')
  DO NOTHING
  RETURNING * INTO v_job;

  IF FOUND THEN
    RETURN NEXT v_job;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.enqueue_reconcile_lab_job(uuid, uuid, timestamptz)
  FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.enqueue_reconcile_lab_job(uuid, uuid, timestamptz)
  TO service_role;
