-- CODEZERO schema aligned with the live Supabase schema.
-- Apply in Supabase SQL editor.

create extension if not exists "pgcrypto";

create table if not exists public.scenarios (
  id uuid primary key default gen_random_uuid(),
  title text,
  description text,
  player_count integer,
  difficulty text,
  data jsonb,
  teacher_id uuid references auth.users(id),
  created_at timestamp without time zone default now()
);

create table if not exists public.game_sessions (
  id uuid primary key default gen_random_uuid(),
  scenario_id uuid references public.scenarios(id) on delete restrict,
  host_id uuid references auth.users(id),
  join_code text not null,
  status text default 'waiting',
  max_players integer,
  started_at timestamp without time zone,
  ended_at timestamp without time zone,
  created_at timestamp without time zone default now()
);

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.game_sessions(id) on delete cascade,
  character_id text not null,
  name text,
  created_at timestamp without time zone default now()
);

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.game_sessions(id) on delete cascade,
  team_id uuid references public.teams(id) on delete cascade,
  nickname text,
  is_ready boolean default false,
  is_connected boolean default true,
  joined_at timestamp without time zone default now()
);

create table if not exists public.votes (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.game_sessions(id) on delete cascade,
  team_id uuid references public.teams(id) on delete cascade,
  target_team_id uuid references public.teams(id) on delete cascade,
  created_at timestamp without time zone default now()
);

create table if not exists public.discovered_clues (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.game_sessions(id) on delete cascade,
  clue_id text,
  team_id uuid references public.teams(id) on delete cascade,
  discovered_at timestamp without time zone default now()
);

alter table public.scenarios enable row level security;
alter table public.game_sessions enable row level security;
alter table public.teams enable row level security;
alter table public.players enable row level security;
alter table public.votes enable row level security;
alter table public.discovered_clues enable row level security;

create policy if not exists "teacher_manage_scenarios" on public.scenarios
  for all to authenticated using (true) with check (true);
create policy if not exists "teacher_manage_sessions" on public.game_sessions
  for all to authenticated using (true) with check (true);
create policy if not exists "teacher_manage_teams" on public.teams
  for all to authenticated using (true) with check (true);
create policy if not exists "teacher_manage_players" on public.players
  for all to authenticated using (true) with check (true);
create policy if not exists "teacher_manage_votes" on public.votes
  for all to authenticated using (true) with check (true);
create policy if not exists "teacher_manage_discovered_clues" on public.discovered_clues
  for all to authenticated using (true) with check (true);

create policy if not exists "students_read_scenarios" on public.scenarios
  for select to anon using (true);
create policy if not exists "students_read_sessions" on public.game_sessions
  for select to anon using (true);
create policy if not exists "students_read_teams" on public.teams
  for select to anon using (true);
create policy if not exists "students_join_players" on public.players
  for insert to anon with check (true);
create policy if not exists "students_vote" on public.votes
  for insert to anon with check (true);
create policy if not exists "students_discover_clues" on public.discovered_clues
  for insert to anon with check (true);
