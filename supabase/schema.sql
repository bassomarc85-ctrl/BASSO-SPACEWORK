-- Basso Work Space - Supabase schema v1
-- Ejecuta TODO este script en Supabase SQL Editor.

begin;

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text not null default 'user' check (role in ('user','team_lead','admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.workers (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  unit text not null default 'hour' check (unit in ('hour','piece')),
  created_at timestamptz not null default now()
);

create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  plan_date date not null,
  client_id uuid references public.clients(id) on delete set null,
  leader_user_id uuid references auth.users(id) on delete set null,
  task_id uuid references public.tasks(id) on delete set null,
  pricing_mode text not null default 'hour' check (pricing_mode in ('hour','piece')),
  note text,
  day_status text not null default 'open' check (day_status in ('open','closed')),
  closed_at timestamptz,
  reopened_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.plan_workers (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans(id) on delete cascade,
  worker_id uuid not null references public.workers(id) on delete cascade,
  hours_worked numeric,
  piece_count numeric,
  worker_task_id uuid references public.tasks(id) on delete set null,
  work_note text,
  created_at timestamptz not null default now(),
  unique(plan_id, worker_id)
);

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  entity text not null,
  entity_id uuid not null,
  action text not null,
  actor_user_id uuid,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace view public.report_rows as
select
  p.plan_date::text as plan_date,
  c.name as client_name,
  t.name as task_name,
  p.pricing_mode,
  p.day_status,
  w.display_name as worker_name,
  pw.hours_worked,
  pw.piece_count,
  wt.name as worker_task_name
from public.plans p
left join public.clients c on c.id = p.client_id
left join public.tasks t on t.id = p.task_id
join public.plan_workers pw on pw.plan_id = p.id
join public.workers w on w.id = pw.worker_id
left join public.tasks wt on wt.id = pw.worker_task_id;

create index if not exists idx_plans_date on public.plans(plan_date);
create index if not exists idx_plans_leader on public.plans(leader_user_id);
create index if not exists idx_plan_workers_plan on public.plan_workers(plan_id);

alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.workers enable row level security;
alter table public.tasks enable row level security;
alter table public.plans enable row level security;
alter table public.plan_workers enable row level security;
alter table public.audit_events enable row level security;

create or replace function public.current_role()
returns text
language sql
stable
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- Profiles
drop policy if exists profiles_select_own_or_admin on public.profiles;
create policy profiles_select_own_or_admin on public.profiles
for select to authenticated
using (id = auth.uid() or public.current_role() = 'admin');

drop policy if exists profiles_insert_self on public.profiles;
create policy profiles_insert_self on public.profiles
for insert to authenticated
with check (id = auth.uid());

drop policy if exists profiles_update_own_or_admin on public.profiles;
create policy profiles_update_own_or_admin on public.profiles
for update to authenticated
using (id = auth.uid() or public.current_role() = 'admin')
with check (id = auth.uid() or public.current_role() = 'admin');

-- Clients
drop policy if exists clients_admin_all on public.clients;
create policy clients_admin_all on public.clients
for all to authenticated
using (public.current_role() = 'admin')
with check (public.current_role() = 'admin');

drop policy if exists clients_read_team_lead on public.clients;
create policy clients_read_team_lead on public.clients
for select to authenticated
using (public.current_role() in ('admin','team_lead'));

-- Workers
drop policy if exists workers_admin_all on public.workers;
create policy workers_admin_all on public.workers
for all to authenticated
using (public.current_role() = 'admin')
with check (public.current_role() = 'admin');

drop policy if exists workers_read_team_lead on public.workers;
create policy workers_read_team_lead on public.workers
for select to authenticated
using (public.current_role() in ('admin','team_lead'));

-- Tasks
drop policy if exists tasks_admin_all on public.tasks;
create policy tasks_admin_all on public.tasks
for all to authenticated
using (public.current_role() = 'admin')
with check (public.current_role() = 'admin');

drop policy if exists tasks_read_team_lead on public.tasks;
create policy tasks_read_team_lead on public.tasks
for select to authenticated
using (public.current_role() in ('admin','team_lead'));

-- Plans
drop policy if exists plans_admin_all on public.plans;
create policy plans_admin_all on public.plans
for all to authenticated
using (public.current_role() = 'admin')
with check (public.current_role() = 'admin');

drop policy if exists plans_team_lead_select on public.plans;
create policy plans_team_lead_select on public.plans
for select to authenticated
using (public.current_role() = 'team_lead' and leader_user_id = auth.uid());

drop policy if exists plans_team_lead_update on public.plans;
create policy plans_team_lead_update on public.plans
for update to authenticated
using (
  public.current_role() in ('admin','team_lead')
  and (public.current_role() = 'admin' or leader_user_id = auth.uid())
)
with check (
  public.current_role() in ('admin','team_lead')
  and (public.current_role() = 'admin' or leader_user_id = auth.uid())
);

-- Plan workers
drop policy if exists plan_workers_admin_all on public.plan_workers;
create policy plan_workers_admin_all on public.plan_workers
for all to authenticated
using (public.current_role() = 'admin')
with check (public.current_role() = 'admin');

drop policy if exists plan_workers_team_lead_select on public.plan_workers;
create policy plan_workers_team_lead_select on public.plan_workers
for select to authenticated
using (
  public.current_role() = 'team_lead'
  and exists (select 1 from public.plans p where p.id = plan_id and p.leader_user_id = auth.uid())
);

drop policy if exists plan_workers_team_lead_update on public.plan_workers;
create policy plan_workers_team_lead_update on public.plan_workers
for update to authenticated
using (
  public.current_role() = 'team_lead'
  and exists (select 1 from public.plans p where p.id = plan_id and p.leader_user_id = auth.uid())
)
with check (
  public.current_role() = 'team_lead'
  and exists (select 1 from public.plans p where p.id = plan_id and p.leader_user_id = auth.uid())
);

-- Audit events (admin only)
drop policy if exists audit_admin_all on public.audit_events;
create policy audit_admin_all on public.audit_events
for all to authenticated
using (public.current_role() = 'admin')
with check (public.current_role() = 'admin');

alter view public.report_rows set (security_invoker = on);

commit;
