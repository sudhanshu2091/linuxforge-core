-- V45: Secure multi-tenant lab isolation.
-- Runtime identity/credential records are service-role only. Learners may read
-- only their own non-secret isolation verification projection.

CREATE TABLE IF NOT EXISTS public.lab_runtime_identities (
  runtime_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id uuid NOT NULL UNIQUE REFERENCES public.lab_instances(id) ON DELETE CASCADE,
  lab_id uuid NOT NULL REFERENCES public.learner_labs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  node_id text,
  binding_generation integer NOT NULL DEFAULT 1 CHECK (binding_generation > 0),
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','REVOKED','QUARANTINED')),
  credential_version integer NOT NULL DEFAULT 1 CHECK (credential_version > 0),
  issued_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS lab_runtime_identities_owner_idx ON public.lab_runtime_identities(user_id, lab_id);
CREATE INDEX IF NOT EXISTS lab_runtime_identities_node_idx ON public.lab_runtime_identities(node_id) WHERE node_id IS NOT NULL;
ALTER TABLE public.lab_runtime_identities ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.lab_runtime_identities FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS public.lab_runtime_credentials (
  credential_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  runtime_id uuid NOT NULL REFERENCES public.lab_runtime_identities(runtime_id) ON DELETE CASCADE,
  credential_version integer NOT NULL,
  secret_hash text NOT NULL,
  issued_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  UNIQUE(runtime_id, credential_version)
);
ALTER TABLE public.lab_runtime_credentials ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.lab_runtime_credentials FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS public.lab_isolation_verifications (
  verification_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  runtime_id uuid NOT NULL REFERENCES public.lab_runtime_identities(runtime_id) ON DELETE CASCADE,
  instance_id uuid NOT NULL REFERENCES public.lab_instances(id) ON DELETE CASCADE,
  lab_id uuid NOT NULL REFERENCES public.learner_labs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  binding_generation integer NOT NULL CHECK (binding_generation > 0),
  state text NOT NULL CHECK (state IN ('PASS','FAIL','UNKNOWN')),
  checks jsonb NOT NULL DEFAULT '{}'::jsonb,
  reason text NOT NULL,
  checked_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS lab_isolation_verifications_owner_idx ON public.lab_isolation_verifications(user_id, lab_id, checked_at DESC);
ALTER TABLE public.lab_isolation_verifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "learners can view own lab isolation verification" ON public.lab_isolation_verifications;
CREATE POLICY "learners can view own lab isolation verification"
  ON public.lab_isolation_verifications FOR SELECT TO authenticated USING (user_id = auth.uid());
REVOKE INSERT, UPDATE, DELETE ON public.lab_isolation_verifications FROM authenticated, anon;
GRANT SELECT ON public.lab_isolation_verifications TO authenticated;

CREATE TABLE IF NOT EXISTS public.lab_network_policies (
  lab_id uuid PRIMARY KEY REFERENCES public.learner_labs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  network_mode text NOT NULL DEFAULT 'none' CHECK (network_mode IN ('none','egress-allowlist')),
  egress_allowlist jsonb NOT NULL DEFAULT '[]'::jsonb,
  inter_lab_access boolean NOT NULL DEFAULT false,
  control_plane_access boolean NOT NULL DEFAULT false,
  host_network_access boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.lab_network_policies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "learners can view own lab network policy" ON public.lab_network_policies;
CREATE POLICY "learners can view own lab network policy"
  ON public.lab_network_policies FOR SELECT TO authenticated USING (user_id = auth.uid());
REVOKE INSERT, UPDATE, DELETE ON public.lab_network_policies FROM authenticated, anon;
GRANT SELECT ON public.lab_network_policies TO authenticated;

CREATE OR REPLACE FUNCTION public.v45_revoke_runtime_identity(p_runtime_id uuid, p_reason text DEFAULT 'revoked')
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.role() <> 'service_role' THEN RAISE EXCEPTION 'internal worker role required'; END IF;
  UPDATE public.lab_runtime_identities
  SET status = 'REVOKED', revoked_at = now(), updated_at = now(), credential_version = credential_version + 1
  WHERE runtime_id = p_runtime_id;
  UPDATE public.lab_runtime_credentials SET revoked_at = now() WHERE runtime_id = p_runtime_id AND revoked_at IS NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.v45_revoke_runtime_identity(uuid,text) FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.v45_revoke_runtime_identity(uuid,text) TO service_role;

CREATE OR REPLACE FUNCTION public.v45_quarantine_runtime_identity(p_runtime_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.role() <> 'service_role' THEN RAISE EXCEPTION 'internal worker role required'; END IF;
  UPDATE public.lab_runtime_identities SET status = 'QUARANTINED', updated_at = now() WHERE runtime_id = p_runtime_id;
END;
$$;
REVOKE ALL ON FUNCTION public.v45_quarantine_runtime_identity(uuid) FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.v45_quarantine_runtime_identity(uuid) TO service_role;
