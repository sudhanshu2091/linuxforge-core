-- LinuxForge Phase 2: durable lab lifecycle job queue.
-- Queue management is an internal worker operation. Learner-facing clients
-- must not be able to claim, complete, or recover arbitrary jobs.

CREATE TABLE IF NOT EXISTS public.lab_jobs (
  id uuid PRIMARY KEY,
  instance_id uuid NOT NULL REFERENCES public.lab_instances(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN (
    'CREATE','START','STOP','RESET','PAUSE','RESUME','RECONCILE','SNAPSHOT','EXPIRE'
  )),
  status text NOT NULL DEFAULT 'QUEUED' CHECK (status IN (
    'QUEUED','RUNNING','SUCCEEDED','FAILED','CANCELLED'
  )),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  max_attempts integer NOT NULL DEFAULT 3 CHECK (max_attempts BETWEEN 1 AND 20),
  priority integer NOT NULL DEFAULT 0,
  available_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  lease_until timestamptz,
  worker_id text,
  last_error text
);

CREATE INDEX IF NOT EXISTS lab_jobs_ready_idx
  ON public.lab_jobs (priority DESC, available_at ASC, created_at ASC, id ASC)
  WHERE status = 'QUEUED';

CREATE INDEX IF NOT EXISTS lab_jobs_lease_idx
  ON public.lab_jobs (lease_until)
  WHERE status = 'RUNNING';

CREATE INDEX IF NOT EXISTS lab_jobs_instance_active_idx
  ON public.lab_jobs (instance_id, status)
  WHERE status IN ('QUEUED','RUNNING');

CREATE INDEX IF NOT EXISTS lab_jobs_user_created_idx
  ON public.lab_jobs (user_id, created_at DESC);

ALTER TABLE public.lab_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "learners can view own lab jobs" ON public.lab_jobs;
CREATE POLICY "learners can view own lab jobs"
  ON public.lab_jobs FOR SELECT TO authenticated
  USING (user_id = auth.uid());

REVOKE INSERT, UPDATE, DELETE ON public.lab_jobs FROM authenticated, anon;
GRANT SELECT ON public.lab_jobs TO authenticated;

CREATE OR REPLACE FUNCTION public.lab_jobs_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS lab_jobs_updated_at ON public.lab_jobs;
CREATE TRIGGER lab_jobs_updated_at
BEFORE UPDATE ON public.lab_jobs
FOR EACH ROW EXECUTE FUNCTION public.lab_jobs_set_updated_at();

CREATE OR REPLACE FUNCTION public.enqueue_lab_job(
  p_id uuid,
  p_instance_id uuid,
  p_user_id uuid,
  p_kind text,
  p_priority integer DEFAULT 0,
  p_max_attempts integer DEFAULT 3,
  p_available_at timestamptz DEFAULT now()
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

  IF p_kind NOT IN ('CREATE','START','STOP','RESET','PAUSE','RESUME','RECONCILE','SNAPSHOT','EXPIRE') THEN
    RAISE EXCEPTION 'unsupported lab job kind';
  END IF;

  IF p_max_attempts < 1 OR p_max_attempts > 20 THEN
    RAISE EXCEPTION 'max attempts must be between 1 and 20';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.lab_instances
    WHERE id = p_instance_id AND user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'lab instance does not belong to learner';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.lab_jobs
    WHERE instance_id = p_instance_id AND status IN ('QUEUED','RUNNING')
  ) THEN
    RAISE EXCEPTION 'lab instance already has an active lifecycle job';
  END IF;

  RETURN QUERY
  INSERT INTO public.lab_jobs (
    id, instance_id, user_id, kind, priority, max_attempts, available_at
  )
  VALUES (
    p_id, p_instance_id, p_user_id, p_kind, p_priority, p_max_attempts, p_available_at
  )
  RETURNING *;
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_next_lab_job(
  p_worker_id text,
  p_lease_seconds integer DEFAULT 30,
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
  IF nullif(trim(p_worker_id), '') IS NULL THEN
    RAISE EXCEPTION 'worker id is required';
  END IF;
  IF p_lease_seconds < 15 OR p_lease_seconds > 300 THEN
    RAISE EXCEPTION 'worker lease must be between 15 and 300 seconds';
  END IF;

  SELECT j.* INTO v_job
  FROM public.lab_jobs j
  WHERE j.status = 'QUEUED'
    AND j.available_at <= p_now
    AND NOT EXISTS (
      SELECT 1
      FROM public.lab_jobs active
      WHERE active.instance_id = j.instance_id
        AND active.status IN ('QUEUED','RUNNING')
        AND active.id <> j.id
    )
  ORDER BY j.priority DESC, j.created_at ASC, j.id ASC
  FOR UPDATE SKIP LOCKED
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  UPDATE public.lab_jobs
  SET status = 'RUNNING',
      attempts = attempts + 1,
      lease_until = p_now + make_interval(secs => p_lease_seconds),
      worker_id = p_worker_id,
      last_error = NULL
  WHERE id = v_job.id
  RETURNING * INTO v_job;

  RETURN NEXT v_job;
END;
$$;

CREATE OR REPLACE FUNCTION public.heartbeat_lab_job(
  p_job_id uuid,
  p_worker_id text,
  p_lease_seconds integer DEFAULT 30,
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
  IF p_lease_seconds < 15 OR p_lease_seconds > 300 THEN
    RAISE EXCEPTION 'worker lease must be between 15 and 300 seconds';
  END IF;

  RETURN QUERY
  UPDATE public.lab_jobs
  SET lease_until = p_now + make_interval(secs => p_lease_seconds)
  WHERE id = p_job_id
    AND status = 'RUNNING'
    AND worker_id = p_worker_id
    AND lease_until > p_now
  RETURNING *;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_lab_job(
  p_job_id uuid,
  p_worker_id text,
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
  SET status = 'SUCCEEDED',
      lease_until = NULL,
      worker_id = NULL,
      last_error = NULL,
      available_at = p_now
  WHERE id = p_job_id
    AND status = 'RUNNING'
    AND worker_id = p_worker_id
    AND lease_until > p_now
  RETURNING *;
END;
$$;

CREATE OR REPLACE FUNCTION public.fail_lab_job(
  p_job_id uuid,
  p_worker_id text,
  p_error text,
  p_retry_base_seconds integer DEFAULT 1,
  p_retry_max_seconds integer DEFAULT 30,
  p_now timestamptz DEFAULT now()
)
RETURNS SETOF public.lab_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job public.lab_jobs;
  v_delay integer;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'internal worker role required';
  END IF;
  IF p_retry_base_seconds < 1 OR p_retry_max_seconds < p_retry_base_seconds THEN
    RAISE EXCEPTION 'invalid retry policy';
  END IF;

  SELECT * INTO v_job
  FROM public.lab_jobs
  WHERE id = p_job_id
    AND status = 'RUNNING'
    AND worker_id = p_worker_id
    AND lease_until > p_now
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF v_job.attempts >= v_job.max_attempts THEN
    RETURN QUERY
    UPDATE public.lab_jobs
    SET status = 'FAILED',
        lease_until = NULL,
        worker_id = NULL,
        last_error = left(coalesce(p_error, 'Job failed.'), 2000),
        available_at = p_now
    WHERE id = p_job_id
    RETURNING *;
    RETURN;
  END IF;

  v_delay := LEAST(
    p_retry_max_seconds,
    p_retry_base_seconds * (2 ^ GREATEST(0, v_job.attempts - 1))
  );

  RETURN QUERY
  UPDATE public.lab_jobs
  SET status = 'QUEUED',
      lease_until = NULL,
      worker_id = NULL,
      last_error = left(coalesce(p_error, 'Job failed; retry scheduled.'), 2000),
      available_at = p_now + make_interval(secs => v_delay)
  WHERE id = p_job_id
  RETURNING *;
END;
$$;

CREATE OR REPLACE FUNCTION public.recover_expired_lab_jobs(
  p_now timestamptz DEFAULT now(),
  p_retry_base_seconds integer DEFAULT 1
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'internal worker role required';
  END IF;
  IF p_retry_base_seconds < 1 THEN
    RAISE EXCEPTION 'retry base must be positive';
  END IF;

  WITH expired AS (
    SELECT id, attempts, max_attempts
    FROM public.lab_jobs
    WHERE status = 'RUNNING'
      AND lease_until IS NOT NULL
      AND lease_until <= p_now
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.lab_jobs j
  SET status = CASE WHEN e.attempts >= e.max_attempts THEN 'FAILED' ELSE 'QUEUED' END,
      lease_until = NULL,
      worker_id = NULL,
      last_error = CASE
        WHEN e.attempts >= e.max_attempts THEN 'Worker lease expired; attempts exhausted.'
        ELSE 'Worker lease expired; job requeued.'
      END,
      available_at = CASE
        WHEN e.attempts >= e.max_attempts THEN p_now
        ELSE p_now + make_interval(secs => p_retry_base_seconds)
      END
  FROM expired e
  WHERE j.id = e.id;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.enqueue_lab_job(uuid, uuid, uuid, text, integer, integer, timestamptz) FROM PUBLIC, authenticated, anon;
REVOKE ALL ON FUNCTION public.claim_next_lab_job(text, integer, timestamptz) FROM PUBLIC, authenticated, anon;
REVOKE ALL ON FUNCTION public.heartbeat_lab_job(uuid, text, integer, timestamptz) FROM PUBLIC, authenticated, anon;
REVOKE ALL ON FUNCTION public.complete_lab_job(uuid, text, timestamptz) FROM PUBLIC, authenticated, anon;
REVOKE ALL ON FUNCTION public.fail_lab_job(uuid, text, text, integer, integer, timestamptz) FROM PUBLIC, authenticated, anon;
REVOKE ALL ON FUNCTION public.recover_expired_lab_jobs(timestamptz, integer) FROM PUBLIC, authenticated, anon;

GRANT EXECUTE ON FUNCTION public.enqueue_lab_job(uuid, uuid, uuid, text, integer, integer, timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_next_lab_job(text, integer, timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.heartbeat_lab_job(uuid, text, integer, timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_lab_job(uuid, text, timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.fail_lab_job(uuid, text, text, integer, integer, timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.recover_expired_lab_jobs(timestamptz, integer) TO service_role;
