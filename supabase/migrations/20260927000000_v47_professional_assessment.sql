-- V47 professional assessment persistence. Runtime execution remains behind V44/V45 server boundaries.
create table if not exists public.professional_assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  assessment_id text not null,
  version integer not null,
  title text not null,
  blueprint jsonb not null,
  state text not null default 'DRAFT',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, assessment_id, version),
  constraint professional_assessments_state check (state in ('DRAFT','READY','PROVISIONING','ACTIVE','SUBMITTED','EVALUATING','EVALUATED','REVIEWED','ARCHIVED','PROVISIONING_FAILED','ABORTED','EXPIRED','QUARANTINED','EVALUATION_FAILED'))
);
create table if not exists public.professional_assessment_objectives (
  id uuid primary key default gen_random_uuid(), assessment_id uuid not null references public.professional_assessments(id) on delete cascade,
  objective_id text not null, definition jsonb not null, unique(assessment_id, objective_id)
);
create table if not exists public.professional_assessment_sessions (
  id uuid primary key default gen_random_uuid(), assessment_id uuid not null references public.professional_assessments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade, state text not null, started_at timestamptz, submitted_at timestamptz, deadline_at timestamptz, active_seconds integer not null default 0, paused_seconds integer not null default 0
);
create table if not exists public.professional_assessment_events (
  id uuid primary key default gen_random_uuid(), assessment_id uuid not null references public.professional_assessments(id) on delete cascade,
  session_id uuid references public.professional_assessment_sessions(id) on delete cascade, user_id uuid not null references auth.users(id) on delete cascade,
  event_id text not null, event_type text not null, objective_id text, runtime_id text not null, terminal_session_id text, evidence jsonb not null, occurred_at timestamptz not null default now(), unique(assessment_id,event_id)
);
create table if not exists public.professional_assessment_results (
  id uuid primary key default gen_random_uuid(), assessment_id uuid not null references public.professional_assessments(id) on delete cascade,
  session_id uuid references public.professional_assessment_sessions(id) on delete cascade, user_id uuid not null references auth.users(id) on delete cascade,
  outcome text not null, overall_score integer not null, objective_rate numeric not null, integrity_status text not null, result jsonb not null, created_at timestamptz not null default now()
);
create table if not exists public.professional_assessment_reports (
  id uuid primary key default gen_random_uuid(), assessment_id uuid not null references public.professional_assessments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade, report jsonb not null, created_at timestamptz not null default now()
);

alter table public.professional_assessments enable row level security;
alter table public.professional_assessment_objectives enable row level security;
alter table public.professional_assessment_sessions enable row level security;
alter table public.professional_assessment_events enable row level security;
alter table public.professional_assessment_results enable row level security;
alter table public.professional_assessment_reports enable row level security;

create policy "professional assessments owner access" on public.professional_assessments for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "professional assessment objectives owner access" on public.professional_assessment_objectives for all to authenticated using (exists (select 1 from public.professional_assessments a where a.id = professional_assessment_objectives.assessment_id and a.user_id = auth.uid())) with check (exists (select 1 from public.professional_assessments a where a.id = professional_assessment_objectives.assessment_id and a.user_id = auth.uid()));
create policy "professional assessment sessions owner access" on public.professional_assessment_sessions for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "professional assessment events owner access" on public.professional_assessment_events for select to authenticated using (user_id = auth.uid());
create policy "professional assessment results owner access" on public.professional_assessment_results for select to authenticated using (user_id = auth.uid());
create policy "professional assessment reports owner access" on public.professional_assessment_reports for select to authenticated using (user_id = auth.uid());
