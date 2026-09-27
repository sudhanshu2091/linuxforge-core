-- v18: authenticated runtime-service request replay protection and operation reconciliation support.
CREATE TABLE IF NOT EXISTS public.runtime_request_nonces (
  nonce text PRIMARY KEY,
  node_id text NOT NULL REFERENCES public.runtime_nodes(node_id) ON DELETE CASCADE,
  operation_id uuid NOT NULL,
  seen_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS runtime_request_nonces_expiry_idx
  ON public.runtime_request_nonces (expires_at);

ALTER TABLE public.runtime_request_nonces ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.runtime_request_nonces FROM PUBLIC, authenticated, anon;

CREATE OR REPLACE FUNCTION public.claim_runtime_request_nonce(
  p_nonce text,
  p_node_id text,
  p_operation_id uuid,
  p_expires_at timestamptz,
  p_now timestamptz DEFAULT now()
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() <> 'service_role' THEN RAISE EXCEPTION 'internal worker role required'; END IF;
  IF nullif(trim(p_nonce), '') IS NULL THEN RAISE EXCEPTION 'runtime request nonce is required'; END IF;
  IF p_expires_at <= p_now THEN RAISE EXCEPTION 'runtime request nonce is already expired'; END IF;

  DELETE FROM public.runtime_request_nonces WHERE expires_at <= p_now;

  INSERT INTO public.runtime_request_nonces (nonce, node_id, operation_id, seen_at, expires_at)
  VALUES (p_nonce, p_node_id, p_operation_id, p_now, p_expires_at)
  ON CONFLICT (nonce) DO NOTHING;

  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_runtime_request_nonce(text,text,uuid,timestamptz,timestamptz) FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.claim_runtime_request_nonce(text,text,uuid,timestamptz,timestamptz) TO service_role;
