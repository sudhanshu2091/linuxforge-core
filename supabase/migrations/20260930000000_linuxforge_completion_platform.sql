-- LinuxForge integrated completion platform (M6-M15 durable control records).
create table if not exists public.platform_missions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mission_key text not null,
  state text not null default 'PLANNED',
  blueprint jsonb not null default '{}'::jsonb,
  environment_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  unique(user_id, mission_key)
);

create table if not exists public.platform_runtime_nodes (
  node_id text primary key,
  provider text not null,
  endpoint text not null,
  state text not null default 'ONLINE',
  active_environments integer not null default 0,
  max_environments integer not null default 8,
  last_heartbeat_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.platform_security_events (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete set null,
  event text not null,
  decision text not null,
  reason text not null,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create table if not exists public.platform_squads (
  squad_id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.platform_squad_members (
  squad_id uuid not null references public.platform_squads(squad_id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'MEMBER',
  joined_at timestamptz not null default now(),
  primary key (squad_id, user_id)
);

create table if not exists public.platform_assessment_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  assessment_key text not null,
  score integer not null,
  passed boolean not null,
  evidence_coverage integer not null,
  independence integer not null,
  remediation jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists platform_missions_user_state_idx on public.platform_missions(user_id, state);
create index if not exists platform_security_events_user_time_idx on public.platform_security_events(user_id, occurred_at desc);
create index if not exists platform_squad_members_user_idx on public.platform_squad_members(user_id);

alter table public.platform_missions enable row level security;
alter table public.platform_runtime_nodes enable row level security;
alter table public.platform_security_events enable row level security;
alter table public.platform_squads enable row level security;
alter table public.platform_squad_members enable row level security;
alter table public.platform_assessment_results enable row level security;

create policy "learners read own missions" on public.platform_missions for select using (auth.uid() = user_id);
create policy "learners read own security events" on public.platform_security_events for select using (auth.uid() = user_id);
create policy "learners read own assessments" on public.platform_assessment_results for select using (auth.uid() = user_id);
create policy "squad members read squads" on public.platform_squads for select using (auth.uid() = owner_id or exists (select 1 from public.platform_squad_members m where m.squad_id = platform_squads.squad_id and m.user_id = auth.uid()));
create policy "squad members read membership" on public.platform_squad_members for select using (auth.uid() = user_id or exists (select 1 from public.platform_squads s where s.squad_id = platform_squad_members.squad_id and s.owner_id = auth.uid()));
