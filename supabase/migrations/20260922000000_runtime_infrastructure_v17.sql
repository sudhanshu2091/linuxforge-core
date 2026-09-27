-- LinuxForge v17: durable runtime infrastructure state.
-- These tables belong to the infrastructure/control-plane boundary. Learner
-- clients never write them directly; service_role owns all mutations.

CREATE TABLE IF NOT EXISTS public.runtime_nodes (
  node_id text PRIMARY KEY,
  backend_id text NOT NULL,
  runtime_class text NOT NULL CHECK (runtime_class IN ('vm','microvm')),
  runtime_version text NOT NULL,
  capabilities jsonb NOT NULL DEFAULT '{}'::jsonb,
  max_environments integer CHECK (max_environments IS NULL OR max_environments > 0),
  active_environments integer NOT NULL DEFAULT 0 CHECK (active_environments >= 0),
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','DRAINING','DISABLED','OFFLINE')),
  enabled boolean NOT NULL DEFAULT true,
  credential_hash text NOT NULL,
  registration_generation integer NOT NULL DEFAULT 1 CHECK (registration_generation > 0),
  registered_at timestamptz NOT NULL DEFAULT now(),
  last_heartbeat_at timestamptz NOT NULL DEFAULT now(),
  heartbeat_ttl_seconds integer NOT NULL DEFAULT 30 CHECK (heartbeat_ttl_seconds BETWEEN 5 AND 300),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS runtime_nodes_class_status_idx
  ON public.runtime_nodes (runtime_class, status, last_heartbeat_at);

ALTER TABLE public.runtime_nodes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.runtime_nodes FROM PUBLIC, authenticated, anon;

CREATE TABLE IF NOT EXISTS public.runtime_node_leases (
  lease_id uuid PRIMARY KEY,
  node_id text NOT NULL REFERENCES public.runtime_nodes(node_id) ON DELETE CASCADE,
  owner_id text NOT NULL,
  acquired_at timestamptz NOT NULL DEFAULT now(),
  heartbeat_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  UNIQUE (node_id)
);

CREATE INDEX IF NOT EXISTS runtime_node_leases_expiry_idx
  ON public.runtime_node_leases (expires_at);

ALTER TABLE public.runtime_node_leases ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.runtime_node_leases FROM PUBLIC, authenticated, anon;

CREATE TABLE IF NOT EXISTS public.runtime_operations (
  operation_id uuid PRIMARY KEY,
  idempotency_key text NOT NULL UNIQUE,
  kind text NOT NULL CHECK (kind IN ('LAUNCH','START','STOP','RESET','PAUSE','RESUME','SNAPSHOT','RESTORE','DESTROY')),
  environment_id text NOT NULL,
  node_id text REFERENCES public.runtime_nodes(node_id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'QUEUED' CHECK (status IN ('QUEUED','RUNNING','SUCCEEDED','FAILED','CANCELLED','UNKNOWN')),
  attempt integer NOT NULL DEFAULT 0 CHECK (attempt >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  lease_until timestamptz,
  owner_id text,
  result_ref text,
  error text
);

CREATE INDEX IF NOT EXISTS runtime_operations_environment_idx
  ON public.runtime_operations (environment_id, created_at DESC);
CREATE INDEX IF NOT EXISTS runtime_operations_lease_idx
  ON public.runtime_operations (lease_until)
  WHERE status = 'RUNNING';

ALTER TABLE public.runtime_operations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.runtime_operations FROM PUBLIC, authenticated, anon;

CREATE OR REPLACE FUNCTION public.register_runtime_node(
  p_node_id text,
  p_backend_id text,
  p_runtime_class text,
  p_runtime_version text,
  p_capabilities jsonb,
  p_max_environments integer,
  p_credential_hash text,
  p_metadata jsonb DEFAULT '{}'::jsonb,
  p_now timestamptz DEFAULT now()
)
RETURNS SETOF public.runtime_nodes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() <> 'service_role' THEN RAISE EXCEPTION 'internal worker role required'; END IF;
  IF nullif(trim(p_node_id), '') IS NULL OR nullif(trim(p_backend_id), '') IS NULL THEN
    RAISE EXCEPTION 'runtime node identity is required';
  END IF;
  IF p_runtime_class NOT IN ('vm','microvm') THEN RAISE EXCEPTION 'production runtime class required'; END IF;
  IF nullif(trim(p_credential_hash), '') IS NULL THEN RAISE EXCEPTION 'runtime credential hash is required'; END IF;

  RETURN QUERY
  INSERT INTO public.runtime_nodes (
    node_id, backend_id, runtime_class, runtime_version, capabilities,
    max_environments, credential_hash, metadata, registered_at, last_heartbeat_at
  )
  VALUES (
    p_node_id, p_backend_id, p_runtime_class, p_runtime_version, coalesce(p_capabilities, '{}'::jsonb),
    p_max_environments, p_credential_hash, coalesce(p_metadata, '{}'::jsonb), p_now, p_now
  )
  ON CONFLICT (node_id) DO UPDATE
  SET backend_id = EXCLUDED.backend_id,
      runtime_class = EXCLUDED.runtime_class,
      runtime_version = EXCLUDED.runtime_version,
      capabilities = EXCLUDED.capabilities,
      max_environments = EXCLUDED.max_environments,
      credential_hash = EXCLUDED.credential_hash,
      metadata = EXCLUDED.metadata,
      status = 'ACTIVE',
      enabled = true,
      registration_generation = public.runtime_nodes.registration_generation + 1,
      registered_at = p_now,
      last_heartbeat_at = p_now
  RETURNING *;
END;
$$;

CREATE OR REPLACE FUNCTION public.heartbeat_runtime_node(
  p_node_id text,
  p_registration_generation integer,
  p_credential_hash text,
  p_now timestamptz DEFAULT now()
)
RETURNS SETOF public.runtime_nodes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() <> 'service_role' THEN RAISE EXCEPTION 'internal worker role required'; END IF;

  RETURN QUERY
  UPDATE public.runtime_nodes
  SET status = 'ACTIVE', enabled = true, last_heartbeat_at = p_now
  WHERE node_id = p_node_id
    AND registration_generation = p_registration_generation
    AND credential_hash = p_credential_hash
    AND status <> 'DISABLED'
  RETURNING *;
END;
$$;

CREATE OR REPLACE FUNCTION public.expire_runtime_nodes(
  p_now timestamptz DEFAULT now()
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_count integer;
BEGIN
  IF auth.role() <> 'service_role' THEN RAISE EXCEPTION 'internal worker role required'; END IF;
  UPDATE public.runtime_nodes
  SET status = 'OFFLINE', enabled = false
  WHERE status IN ('ACTIVE','DRAINING')
    AND last_heartbeat_at + make_interval(secs => heartbeat_ttl_seconds) <= p_now;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.begin_runtime_operation(
  p_operation_id uuid,
  p_idempotency_key text,
  p_kind text,
  p_environment_id text,
  p_node_id text DEFAULT NULL,
  p_now timestamptz DEFAULT now()
)
RETURNS SETOF public.runtime_operations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_existing public.runtime_operations;
BEGIN
  IF auth.role() <> 'service_role' THEN RAISE EXCEPTION 'internal worker role required'; END IF;
  IF nullif(trim(p_idempotency_key), '') IS NULL OR nullif(trim(p_environment_id), '') IS NULL THEN
    RAISE EXCEPTION 'runtime operation identity is required';
  END IF;
  IF p_kind NOT IN ('LAUNCH','START','STOP','RESET','PAUSE','RESUME','SNAPSHOT','RESTORE','DESTROY') THEN
    RAISE EXCEPTION 'unsupported runtime operation';
  END IF;

  SELECT * INTO v_existing FROM public.runtime_operations WHERE idempotency_key = p_idempotency_key;
  IF FOUND THEN
    IF v_existing.kind <> p_kind OR v_existing.environment_id <> p_environment_id THEN
      RAISE EXCEPTION 'idempotency key is bound to a different operation';
    END IF;
    RETURN NEXT v_existing;
    RETURN;
  END IF;

  RETURN QUERY
  INSERT INTO public.runtime_operations (
    operation_id, idempotency_key, kind, environment_id, node_id, created_at, updated_at
  ) VALUES (
    p_operation_id, p_idempotency_key, p_kind, p_environment_id, p_node_id, p_now, p_now
  ) RETURNING *;
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_runtime_operation(
  p_operation_id uuid,
  p_owner_id text,
  p_lease_seconds integer DEFAULT 30,
  p_now timestamptz DEFAULT now()
)
RETURNS SETOF public.runtime_operations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() <> 'service_role' THEN RAISE EXCEPTION 'internal worker role required'; END IF;
  IF p_lease_seconds < 5 OR p_lease_seconds > 300 THEN RAISE EXCEPTION 'invalid runtime lease'; END IF;

  RETURN QUERY
  UPDATE public.runtime_operations
  SET status = 'RUNNING', attempt = attempt + 1,
      owner_id = p_owner_id, lease_until = p_now + make_interval(secs => p_lease_seconds),
      updated_at = p_now, error = NULL
  WHERE operation_id = p_operation_id
    AND status IN ('QUEUED','UNKNOWN')
  RETURNING *;
END;
$$;

CREATE OR REPLACE FUNCTION public.heartbeat_runtime_operation(
  p_operation_id uuid,
  p_owner_id text,
  p_lease_seconds integer DEFAULT 30,
  p_now timestamptz DEFAULT now()
)
RETURNS SETOF public.runtime_operations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() <> 'service_role' THEN RAISE EXCEPTION 'internal worker role required'; END IF;
  RETURN QUERY
  UPDATE public.runtime_operations
  SET lease_until = p_now + make_interval(secs => p_lease_seconds), updated_at = p_now
  WHERE operation_id = p_operation_id
    AND status = 'RUNNING'
    AND owner_id = p_owner_id
    AND lease_until > p_now
  RETURNING *;
END;
$$;

CREATE OR REPLACE FUNCTION public.finish_runtime_operation(
  p_operation_id uuid,
  p_owner_id text,
  p_status text,
  p_result_ref text DEFAULT NULL,
  p_error text DEFAULT NULL,
  p_now timestamptz DEFAULT now()
)
RETURNS SETOF public.runtime_operations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() <> 'service_role' THEN RAISE EXCEPTION 'internal worker role required'; END IF;
  IF p_status NOT IN ('SUCCEEDED','FAILED') THEN RAISE EXCEPTION 'invalid terminal runtime operation status'; END IF;

  RETURN QUERY
  UPDATE public.runtime_operations
  SET status = p_status,
      lease_until = NULL,
      owner_id = NULL,
      result_ref = p_result_ref,
      error = left(p_error, 2000),
      updated_at = p_now
  WHERE operation_id = p_operation_id
    AND status = 'RUNNING'
    AND owner_id = p_owner_id
    AND lease_until > p_now
  RETURNING *;
END;
$$;

CREATE OR REPLACE FUNCTION public.recover_runtime_operations(
  p_now timestamptz DEFAULT now()
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_count integer;
BEGIN
  IF auth.role() <> 'service_role' THEN RAISE EXCEPTION 'internal worker role required'; END IF;
  UPDATE public.runtime_operations
  SET status = 'UNKNOWN', lease_until = NULL, owner_id = NULL,
      error = 'Runtime operation lease expired; outcome requires reconciliation.', updated_at = p_now
  WHERE status = 'RUNNING' AND lease_until IS NOT NULL AND lease_until <= p_now;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.register_runtime_node(text,text,text,text,jsonb,integer,text,jsonb,timestamptz) FROM PUBLIC, authenticated, anon;
REVOKE ALL ON FUNCTION public.heartbeat_runtime_node(text,integer,text,timestamptz) FROM PUBLIC, authenticated, anon;
REVOKE ALL ON FUNCTION public.expire_runtime_nodes(timestamptz) FROM PUBLIC, authenticated, anon;
REVOKE ALL ON FUNCTION public.begin_runtime_operation(uuid,text,text,text,text,timestamptz) FROM PUBLIC, authenticated, anon;
REVOKE ALL ON FUNCTION public.claim_runtime_operation(uuid,text,integer,timestamptz) FROM PUBLIC, authenticated, anon;
REVOKE ALL ON FUNCTION public.heartbeat_runtime_operation(uuid,text,integer,timestamptz) FROM PUBLIC, authenticated, anon;
REVOKE ALL ON FUNCTION public.finish_runtime_operation(uuid,text,text,text,text,timestamptz) FROM PUBLIC, authenticated, anon;
REVOKE ALL ON FUNCTION public.recover_runtime_operations(timestamptz) FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.register_runtime_node(text,text,text,text,jsonb,integer,text,jsonb,timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.heartbeat_runtime_node(text,integer,text,timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.expire_runtime_nodes(timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.begin_runtime_operation(uuid,text,text,text,text,timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_runtime_operation(uuid,text,integer,timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.heartbeat_runtime_operation(uuid,text,integer,timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.finish_runtime_operation(uuid,text,text,text,text,timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.recover_runtime_operations(timestamptz) TO service_role;
