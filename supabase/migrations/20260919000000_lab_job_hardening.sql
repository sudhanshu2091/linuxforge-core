-- Phase 2: durable queue hardening.
-- Repair any pre-existing duplicate active jobs before enforcing the invariant.
WITH ranked AS (
  SELECT id,
         row_number() OVER (PARTITION BY instance_id ORDER BY created_at ASC, id ASC) AS rn
  FROM public.lab_jobs
  WHERE status IN ('QUEUED', 'RUNNING')
)
UPDATE public.lab_jobs j
SET status = 'CANCELLED',
    lease_until = NULL,
    worker_id = NULL,
    last_error = 'Cancelled during queue invariant migration: duplicate active lifecycle job.'
FROM ranked r
WHERE j.id = r.id
  AND r.rn > 1;

-- Only one active lifecycle job may exist for a lab instance.
CREATE UNIQUE INDEX IF NOT EXISTS lab_jobs_one_active_per_instance_idx
  ON public.lab_jobs (instance_id)
  WHERE status IN ('QUEUED', 'RUNNING');

CREATE OR REPLACE FUNCTION public.cancel_queued_lab_job(
  p_job_id uuid,
  p_user_id uuid,
  p_now timestamptz DEFAULT now()
)
RETURNS SETOF public.lab_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'internal worker role required';
  END IF;

  RETURN QUERY
  UPDATE public.lab_jobs
  SET status = 'CANCELLED',
      lease_until = NULL,
      worker_id = NULL,
      available_at = p_now,
      last_error = NULL
  WHERE id = p_job_id
    AND user_id = p_user_id
    AND status = 'QUEUED'
  RETURNING *;
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_queued_lab_job(uuid, uuid, timestamptz) FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.cancel_queued_lab_job(uuid, uuid, timestamptz) TO service_role;
