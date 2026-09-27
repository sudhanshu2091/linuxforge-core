-- V49.1: Runtime identity hardening.
--
-- Security invariants:
--   1. lab_instances is the authoritative owner of a runtime identity.
--   2. One instance can have exactly one canonical runtime_id.
--   3. Creation/refresh is serialized on the lab_instances row.
--   4. A runtime identity can never be silently reactivated after revoke/quarantine.
--   5. Binding generations can move forward, never backward.
--   6. Isolation verification is inserted only after the canonical identity is
--      locked and all ownership/generation fields match.
--
-- These functions are service-role-only because the underlying identity and
-- verification writes are control-plane security operations.

CREATE OR REPLACE FUNCTION public.v49_ensure_runtime_identity(
  p_instance_id uuid,
  p_binding_generation integer,
  p_ttl_ms bigint DEFAULT 3600000,
  p_now timestamptz DEFAULT NULL
)
RETURNS SETOF public.lab_runtime_identities
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_instance public.lab_instances%ROWTYPE;
  v_identity public.lab_runtime_identities%ROWTYPE;
  v_now timestamptz := COALESCE(p_now, now());
  v_expires_at timestamptz;
  v_expected_generation integer;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'internal worker role required';
  END IF;

  IF p_binding_generation IS NULL OR p_binding_generation < 1 THEN
    RAISE EXCEPTION 'Runtime binding generation is invalid.';
  END IF;

  IF p_ttl_ms IS NULL OR p_ttl_ms < 1000 OR p_ttl_ms > 86400000 THEN
    RAISE EXCEPTION 'Runtime binding TTL is invalid.';
  END IF;

  -- Serialize every identity operation for this logical runtime instance.
  SELECT *
  INTO v_instance
  FROM public.lab_instances
  WHERE id = p_instance_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lab instance does not exist.';
  END IF;

  v_expected_generation := GREATEST(1, v_instance.runtime_binding_generation);
  IF p_binding_generation <> v_expected_generation THEN
    RAISE EXCEPTION 'Runtime binding generation does not match the authoritative lab instance.';
  END IF;

  v_expires_at := v_now + (p_ttl_ms * interval '1 millisecond');

  -- Lock the identity if it already exists. The unique instance_id constraint
  -- remains the database-level invariant even if this function is bypassed by
  -- a future internal worker.
  SELECT *
  INTO v_identity
  FROM public.lab_runtime_identities
  WHERE instance_id = p_instance_id
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.lab_runtime_identities (
      runtime_id,
      instance_id,
      lab_id,
      user_id,
      node_id,
      binding_generation,
      status,
      credential_version,
      issued_at,
      expires_at,
      revoked_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      v_instance.id,
      v_instance.lab_id,
      v_instance.user_id,
      v_instance.runtime_node_id,
      p_binding_generation,
      'ACTIVE',
      1,
      v_now,
      v_expires_at,
      NULL,
      v_now
    )
    RETURNING * INTO v_identity;
  ELSE
    IF v_identity.lab_id <> v_instance.lab_id OR v_identity.user_id <> v_instance.user_id THEN
      RAISE EXCEPTION 'Runtime identity ownership does not match its lab instance.';
    END IF;

    IF v_identity.status <> 'ACTIVE' THEN
      RAISE EXCEPTION 'Runtime identity is % and cannot be reactivated.', v_identity.status;
    END IF;

    IF p_binding_generation < v_identity.binding_generation THEN
      RAISE EXCEPTION 'Runtime binding generation is stale.';
    END IF;

    IF p_binding_generation = v_identity.binding_generation THEN
      -- Idempotent call: do not rotate the identity, credentials, or expiry.
      RETURN NEXT v_identity;
      RETURN;
    END IF;

    UPDATE public.lab_runtime_identities
    SET
      lab_id = v_instance.lab_id,
      user_id = v_instance.user_id,
      node_id = v_instance.runtime_node_id,
      binding_generation = p_binding_generation,
      status = 'ACTIVE',
      credential_version = credential_version + 1,
      issued_at = v_now,
      expires_at = v_expires_at,
      revoked_at = NULL,
      updated_at = v_now
    WHERE runtime_id = v_identity.runtime_id
    RETURNING * INTO v_identity;
  END IF;

  RETURN NEXT v_identity;
END;
$$;

REVOKE ALL ON FUNCTION public.v49_ensure_runtime_identity(uuid,integer,bigint,timestamptz) FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.v49_ensure_runtime_identity(uuid,integer,bigint,timestamptz) TO service_role;

CREATE OR REPLACE FUNCTION public.v49_persist_isolation_verification(
  p_verification_id uuid,
  p_runtime_id uuid,
  p_instance_id uuid,
  p_lab_id uuid,
  p_user_id uuid,
  p_binding_generation integer,
  p_state text,
  p_checks jsonb,
  p_reason text,
  p_checked_at timestamptz
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_identity public.lab_runtime_identities%ROWTYPE;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'internal worker role required';
  END IF;

  IF p_state NOT IN ('PASS', 'FAIL', 'UNKNOWN') THEN
    RAISE EXCEPTION 'Invalid isolation verification state.';
  END IF;

  IF p_binding_generation IS NULL OR p_binding_generation < 1 THEN
    RAISE EXCEPTION 'Invalid isolation binding generation.';
  END IF;

  IF p_reason IS NULL OR length(trim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'Isolation verification reason is required.';
  END IF;

  -- Lock the canonical identity before inserting the FK row. This closes the
  -- read-then-insert race where a caller could otherwise verify a stale or
  -- non-canonical runtime_id.
  SELECT *
  INTO v_identity
  FROM public.lab_runtime_identities
  WHERE runtime_id = p_runtime_id
    AND instance_id = p_instance_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Canonical runtime identity was not found for this instance.';
  END IF;

  IF v_identity.status <> 'ACTIVE' THEN
    RAISE EXCEPTION 'Runtime identity is not active.';
  END IF;

  IF v_identity.lab_id <> p_lab_id OR v_identity.user_id <> p_user_id THEN
    RAISE EXCEPTION 'Isolation verification ownership does not match the runtime identity.';
  END IF;

  IF v_identity.binding_generation <> p_binding_generation THEN
    RAISE EXCEPTION 'Isolation verification binding generation does not match the canonical runtime identity.';
  END IF;

  IF v_identity.expires_at <= now() THEN
    RAISE EXCEPTION 'Runtime identity has expired.';
  END IF;

  INSERT INTO public.lab_isolation_verifications (
    verification_id,
    runtime_id,
    instance_id,
    lab_id,
    user_id,
    binding_generation,
    state,
    checks,
    reason,
    checked_at
  ) VALUES (
    p_verification_id,
    p_runtime_id,
    p_instance_id,
    p_lab_id,
    p_user_id,
    p_binding_generation,
    p_state,
    COALESCE(p_checks, '{}'::jsonb),
    p_reason,
    COALESCE(p_checked_at, now())
  );
END;
$$;

REVOKE ALL ON FUNCTION public.v49_persist_isolation_verification(uuid,uuid,uuid,uuid,uuid,integer,text,jsonb,text,timestamptz) FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.v49_persist_isolation_verification(uuid,uuid,uuid,uuid,uuid,integer,text,jsonb,text,timestamptz) TO service_role;
