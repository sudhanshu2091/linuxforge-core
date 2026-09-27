-- V46 cybersecurity lab ecosystem metadata. Runtime execution remains outside Supabase.
create table if not exists public.cyber_lab_scenarios (
  id uuid primary key default gen_random_uuid(),
  lab_id uuid not null references public.lab_instances(id) on delete cascade,
  scenario_kind text not null,
  title text not null,
  topology jsonb not null,
  capabilities jsonb not null,
  state text not null default 'DRAFT',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cyber_lab_scenarios_kind check (scenario_kind in ('KALI_WORKSTATION','WEB_SECURITY','NETWORK_ENUMERATION','SYSTEM_SECURITY','PRIVILEGE_ESCALATION','ACTIVE_DIRECTORY','CTF','MULTI_MACHINE_PENTEST')),
  constraint cyber_lab_scenarios_state check (state in ('DRAFT','PROVISIONING','READY','ACTIVE','RESETTING','STOPPED','QUARANTINED','DESTROYED'))
);

alter table public.cyber_lab_scenarios enable row level security;

create policy "cyber lab scenarios owner access" on public.cyber_lab_scenarios
for all to authenticated
using (exists (select 1 from public.lab_instances li where li.id = cyber_lab_scenarios.lab_id and li.user_id = auth.uid()))
with check (exists (select 1 from public.lab_instances li where li.id = cyber_lab_scenarios.lab_id and li.user_id = auth.uid()));
