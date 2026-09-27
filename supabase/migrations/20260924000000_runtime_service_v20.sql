-- LinuxForge v20: durable Runtime Service gateway reconciliation boundary.
-- Gateway process memory is no longer required for operation completion after
-- the request has crossed the service-role PostgreSQL boundary.

CREATE OR REPLACE FUNCTION public.reconcile_runtime_operation(
  p_operation_id uuid,
  p_result_ref text DEFAULT NULL,
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
  SET status = 'SUCCEEDED',
      result_ref = p_result_ref,
      error = NULL,
      lease_until = NULL,
      owner_id = NULL,
      updated_at = p_now
  WHERE operation_id = p_operation_id
    AND status = 'UNKNOWN'
  RETURNING *;
END;
$$;

REVOKE ALL ON FUNCTION public.reconcile_runtime_operation(uuid,text,timestamptz) FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.reconcile_runtime_operation(uuid,text,timestamptz) TO service_role;
