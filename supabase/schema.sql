-- CODEZERO baseline schema for static-export frontend architecture.
-- Apply in Supabase SQL editor.

create extension if not exists "pgcrypto";

create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  grade_level text not null default 'high-school-2nd',
  classroom_code text not null unique,
  phase text not null default 'briefing',
  public_briefing text not null,
  ai_case_payload jsonb,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  name text not null,
  role text not null,
  private_briefing text not null,
  access_code text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  culprit text not null default '',
  motive text not null default '',
  method text not null default '',
  timeline text not null default '',
  updated_at timestamptz not null default now(),
  unique (game_id, team_id)
);

alter table public.games enable row level security;
alter table public.teams enable row level security;
alter table public.submissions enable row level security;

-- Teacher policies: authenticated users can manage all rows for baseline prototype.
create policy if not exists "teacher_manage_games" on public.games
  for all to authenticated
  using (true)
  with check (true);

create policy if not exists "teacher_manage_teams" on public.teams
  for all to authenticated
  using (true)
  with check (true);

create policy if not exists "teacher_manage_submissions" on public.submissions
  for all to authenticated
  using (true)
  with check (true);

-- Student policies: anonymous read/join/write through access codes.
create policy if not exists "students_read_games" on public.games
  for select to anon
  using (true);

create policy if not exists "students_read_teams" on public.teams
  for select to anon
  using (true);

create policy if not exists "students_submit_reports" on public.submissions
  for insert to anon
  with check (true);

create policy if not exists "students_update_reports" on public.submissions
  for update to anon
  using (true)
  with check (true);
