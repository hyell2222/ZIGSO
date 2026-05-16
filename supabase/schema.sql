-- =====================================================================
-- School Lunch Rush — fresh schema
-- Apply on a clean database (or drop legacy tables first).
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Drop legacy mystery tables (safe if already removed)
-- ---------------------------------------------------------------------
drop table if exists public.player_reports cascade;
drop table if exists public.clues cascade;
drop table if exists public.locations cascade;
drop table if exists public.players cascade;
drop table if exists public.teams cascade;
drop table if exists public.game_sessions cascade;
drop table if exists public.cases cascade;

-- ---------------------------------------------------------------------
-- lessons — teacher-authored lunch scenario (ScenarioPack JSON)
-- ---------------------------------------------------------------------
create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  scenario_pack jsonb not null,
  difficulty text not null default 'Normal'
    check (difficulty in ('Easy', 'Normal', 'Hard')),
  english_level text not null default 'A2'
    check (english_level in ('A1', 'A2', 'B1', 'B2')),
  team_size int not null default 4 check (team_size >= 2 and team_size <= 12),
  menu_count int not null default 0 check (menu_count >= 0),
  creator_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- ---------------------------------------------------------------------
-- sessions — live classroom play
-- phases: waiting → briefing → investigation → final_report → session_end
-- ---------------------------------------------------------------------
create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  host_id uuid references auth.users(id) on delete set null,
  join_code text not null unique,
  phase text not null default 'waiting'
    check (phase in ('waiting', 'briefing', 'investigation', 'final_report', 'session_end')),
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

-- ---------------------------------------------------------------------
-- teams — cooperative lunch tray progress
-- ---------------------------------------------------------------------
create table public.teams (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  name text not null,
  acquired_ingredients jsonb not null default '[]'::jsonb,
  completed_menus jsonb not null default '[]'::jsonb,
  tray_submitted_at timestamptz
);

-- ---------------------------------------------------------------------
-- players — students (anonymous join)
-- ---------------------------------------------------------------------
create table public.players (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  team_id uuid references public.teams(id) on delete set null,
  nickname text not null,
  assigned_ingredient_id text,
  is_online boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

-- ---------------------------------------------------------------------
-- updated_at trigger (lessons)
-- ---------------------------------------------------------------------
create or replace function public.touch_updated_at() returns trigger as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$ language plpgsql;

create trigger lessons_touch_updated_at
  before update on public.lessons
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------
-- indexes
-- ---------------------------------------------------------------------
create index lessons_creator_id_idx on public.lessons (creator_id);
create index sessions_lesson_id_idx on public.sessions (lesson_id);
create index sessions_host_id_idx on public.sessions (host_id);
create index sessions_active_idx on public.sessions (is_active);
create index teams_session_id_idx on public.teams (session_id);
create index players_session_id_idx on public.players (session_id);
create index players_team_id_idx on public.players (team_id);

-- ---------------------------------------------------------------------
-- row level security
-- ---------------------------------------------------------------------
alter table public.lessons enable row level security;
alter table public.sessions enable row level security;
alter table public.teams enable row level security;
alter table public.players enable row level security;

create policy "lessons are publicly readable" on public.lessons
  for select using (true);
create policy "teachers insert own lessons" on public.lessons
  for insert to authenticated with check (creator_id = auth.uid());
create policy "teachers update own lessons" on public.lessons
  for update to authenticated
  using (creator_id = auth.uid()) with check (creator_id = auth.uid());
create policy "teachers delete own lessons" on public.lessons
  for delete to authenticated using (creator_id = auth.uid());

create policy "sessions are publicly readable" on public.sessions
  for select using (true);
create policy "hosts insert own sessions" on public.sessions
  for insert to authenticated with check (host_id = auth.uid());
create policy "hosts update own sessions" on public.sessions
  for update to authenticated
  using (host_id = auth.uid()) with check (host_id = auth.uid());
create policy "hosts delete own sessions" on public.sessions
  for delete to authenticated using (host_id = auth.uid());

create policy "teams are publicly readable" on public.teams
  for select using (true);
create policy "anyone can create team" on public.teams
  for insert with check (
    exists (select 1 from public.sessions s where s.id = teams.session_id)
  );
create policy "anyone can update team" on public.teams
  for update using (
    exists (select 1 from public.sessions s where s.id = teams.session_id)
  ) with check (
    exists (select 1 from public.sessions s where s.id = teams.session_id)
  );
create policy "host can delete team" on public.teams
  for delete to authenticated using (
    exists (
      select 1 from public.sessions s
      where s.id = teams.session_id and s.host_id = auth.uid()
    )
  );

create policy "players are publicly readable" on public.players
  for select using (true);
create policy "anyone can join as player" on public.players
  for insert with check (
    exists (select 1 from public.sessions s where s.id = players.session_id)
  );
create policy "anyone can update player" on public.players
  for update using (
    exists (select 1 from public.sessions s where s.id = players.session_id)
  ) with check (
    exists (select 1 from public.sessions s where s.id = players.session_id)
  );
create policy "anyone can leave player" on public.players
  for delete using (true);

-- ---------------------------------------------------------------------
-- grants
-- ---------------------------------------------------------------------
grant usage on schema public to anon, authenticated;

grant select on public.lessons to anon, authenticated;
grant select on public.sessions to anon, authenticated;
grant select on public.teams to anon, authenticated;
grant select on public.players to anon, authenticated;

grant insert, update, delete on public.lessons to authenticated;
grant insert, update, delete on public.sessions to authenticated;
grant insert, update on public.teams to anon, authenticated;
grant insert, update, delete on public.players to anon, authenticated;

-- ---------------------------------------------------------------------
-- realtime
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'sessions'
  ) then
    alter publication supabase_realtime add table public.sessions;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'teams'
  ) then
    alter publication supabase_realtime add table public.teams;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'players'
  ) then
    alter publication supabase_realtime add table public.players;
  end if;
end
$$;
