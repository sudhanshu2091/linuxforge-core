# V49 terminal RLS fix

## Problem

The browser terminal reached the authenticated TanStack server function, but the real Linux lab path attempted to read/write `lab_runtime_identities` and `lab_isolation_verifications` through the learner-scoped Supabase client. V45 intentionally revokes direct access to `lab_runtime_identities`, so the request failed with:

`permission denied for table lab_runtime_identities`

The terminal therefore remained on the modelled sandbox UI instead of issuing a real-VM PTY ticket.

## Fix

V49 now keeps the learner-scoped Supabase client for learner-owned control-plane rows and uses a **server-only Supabase secret/service-role client** for runtime identity and isolation-verification operations.

The secret key is never exposed to the browser and must never use a `VITE_*` variable.

Supported environment names:

- `SUPABASE_SECRET_KEY` (preferred)
- `SUPABASE_SERVICE_ROLE_KEY` (legacy compatibility)

## Local setup

Add the server-only key to `.env.local`:

```text
SUPABASE_SECRET_KEY=sb_secret_...
```

Do not paste this key into source code, the browser, Git, or chat.

Restart `npm run dev` after changing `.env.local`.

## Expected flow

Browser -> authenticated server function -> learner lab rows via RLS -> internal runtime identity via secret client -> signed terminal ticket -> terminal gateway -> real Kali VM.
