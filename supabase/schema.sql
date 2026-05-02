create extension if not exists pgcrypto;

-- =====================================================================
-- Tables
-- =====================================================================
-- 3단계 게임: briefing → investigation → final_report
-- 역할(부장/차장/부원)·조사 장소: 세션 시작 시 랜덤 (assignTeamsAndInvestigation)
-- =====================================================================

create table if not exists public.cases (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  -- [{ "id", "name", "detail" }] — 사건 파악·범인 선택·정답 id 기준
  suspect_roster jsonb not null default '[]'::jsonb,
  -- 용의자 id 중 범인 1명 (suspect_roster[].id)
  answer_suspect_id text,
  difficulty text check (difficulty in ('Easy', 'Normal', 'Hard')),
  creator_id uuid,
  created_at timestamptz default timezone('utc', now()),
  updated_at timestamptz default timezone('utc', now())
);

create table if not exists public.locations (
  id uuid primary key default gen_random_uuid(),
  case_id uuid references public.cases(id) on delete cascade,
  name text
);

create table if not exists public.clues (
  id uuid primary key default gen_random_uuid(),
  case_id uuid references public.cases(id) on delete cascade,
  location_id uuid references public.locations(id) on delete set null,
  name text,
  content text,
  props jsonb
);

create table if not exists public.game_sessions (
  id uuid primary key default gen_random_uuid(),
  case_id uuid references public.cases(id) on delete set null,
  host_id uuid references auth.users(id) on delete set null,
  join_code text unique not null,
  phase text default 'waiting' check (phase in ('waiting', 'briefing', 'investigation', 'final_report', 'session_end')),
  is_active boolean default true,
  created_at timestamptz default timezone('utc', now())
);

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.game_sessions(id) on delete cascade,
  name text,
  found_clue_ids uuid[] not null default '{}',
  -- cases.suspect_roster[].id 중 선택
  report_suspect_id text,
  report_method text,
  report_motive text,
  report_decisive_clue text,
  report_submitted_at timestamptz
);

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  nickname text,
  session_id uuid references public.game_sessions(id) on delete cascade,
  team_id uuid references public.teams(id) on delete set null,
  club_role text
    check (club_role is null or club_role in ('president', 'vice_president', 'member')),
  investigation_location_id uuid,
  is_online boolean default true
);

do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'players'
      and constraint_name = 'players_investigation_location_id_fkey'
  ) then
    alter table public.players
      add constraint players_investigation_location_id_fkey
      foreign key (investigation_location_id)
      references public.locations(id)
      on delete set null;
  end if;
end
$$;

-- =====================================================================
-- updated_at (cases)
-- =====================================================================

create or replace function public.touch_updated_at() returns trigger as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$ language plpgsql;

drop trigger if exists cases_touch_updated_at on public.cases;
create trigger cases_touch_updated_at
  before update on public.cases
  for each row execute function public.touch_updated_at();

-- =====================================================================
-- Indexes
-- =====================================================================

create unique index if not exists game_sessions_join_code_key on public.game_sessions (join_code);
create index if not exists cases_creator_id_idx on public.cases (creator_id);
create index if not exists locations_case_id_idx on public.locations (case_id);
create index if not exists clues_case_id_idx on public.clues (case_id);
create index if not exists clues_location_id_idx on public.clues (location_id);
create index if not exists game_sessions_case_id_idx on public.game_sessions (case_id);
create index if not exists game_sessions_host_id_idx on public.game_sessions (host_id);
create index if not exists game_sessions_active_idx on public.game_sessions (is_active);
create index if not exists teams_session_id_idx on public.teams (session_id);
create index if not exists players_session_id_idx on public.players (session_id);
create index if not exists players_team_id_idx on public.players (team_id);
create index if not exists players_investigation_location_id_idx on public.players (investigation_location_id);
create index if not exists players_club_role_idx on public.players (club_role);
create index if not exists teams_report_submitted_at_idx on public.teams (report_submitted_at);

-- =====================================================================
-- Row Level Security
-- =====================================================================

alter table if exists public.cases enable row level security;
alter table if exists public.locations enable row level security;
alter table if exists public.clues enable row level security;
alter table if exists public.game_sessions enable row level security;
alter table if exists public.teams enable row level security;
alter table if exists public.players enable row level security;

drop policy if exists "cases are publicly readable" on public.cases;
drop policy if exists "teachers insert own cases" on public.cases;
drop policy if exists "teachers update own cases" on public.cases;
drop policy if exists "teachers delete own cases" on public.cases;

create policy "cases are publicly readable" on public.cases
  for select using (true);
create policy "teachers insert own cases" on public.cases
  for insert to authenticated
  with check (creator_id = auth.uid());
create policy "teachers update own cases" on public.cases
  for update to authenticated
  using (creator_id = auth.uid())
  with check (creator_id = auth.uid());
create policy "teachers delete own cases" on public.cases
  for delete to authenticated
  using (creator_id = auth.uid());

drop policy if exists "locations are publicly readable" on public.locations;
drop policy if exists "owners manage locations" on public.locations;

create policy "locations are publicly readable" on public.locations
  for select using (true);
create policy "owners manage locations" on public.locations
  for all to authenticated
  using (
    exists (
      select 1 from public.cases s
      where s.id = locations.case_id and s.creator_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.cases s
      where s.id = locations.case_id and s.creator_id = auth.uid()
    )
  );

drop policy if exists "clues are publicly readable" on public.clues;
drop policy if exists "owners manage clues" on public.clues;

create policy "clues are publicly readable" on public.clues
  for select using (true);
create policy "owners manage clues" on public.clues
  for all to authenticated
  using (
    exists (
      select 1 from public.cases s
      where s.id = clues.case_id and s.creator_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.cases s
      where s.id = clues.case_id and s.creator_id = auth.uid()
    )
  );

drop policy if exists "sessions are publicly readable" on public.game_sessions;
drop policy if exists "hosts insert own sessions" on public.game_sessions;
drop policy if exists "hosts update own sessions" on public.game_sessions;
drop policy if exists "hosts delete own sessions" on public.game_sessions;

create policy "sessions are publicly readable" on public.game_sessions
  for select using (true);
create policy "hosts insert own sessions" on public.game_sessions
  for insert to authenticated
  with check (host_id = auth.uid());
create policy "hosts update own sessions" on public.game_sessions
  for update to authenticated
  using (host_id = auth.uid())
  with check (host_id = auth.uid());
create policy "hosts delete own sessions" on public.game_sessions
  for delete to authenticated
  using (host_id = auth.uid());

drop policy if exists "teams are publicly readable" on public.teams;
drop policy if exists "anyone can create team" on public.teams;
drop policy if exists "anyone can update team" on public.teams;
drop policy if exists "host can delete team" on public.teams;

create policy "teams are publicly readable" on public.teams
  for select using (true);
create policy "anyone can create team" on public.teams
  for insert with check (
    exists (select 1 from public.game_sessions g where g.id = teams.session_id)
  );
create policy "anyone can update team" on public.teams
  for update using (
    exists (select 1 from public.game_sessions g where g.id = teams.session_id)
  )
  with check (
    exists (select 1 from public.game_sessions g where g.id = teams.session_id)
  );
create policy "host can delete team" on public.teams
  for delete to authenticated
  using (
    exists (
      select 1 from public.game_sessions g
      where g.id = teams.session_id and g.host_id = auth.uid()
    )
  );

drop policy if exists "players are publicly readable" on public.players;
drop policy if exists "anyone can join as player" on public.players;
drop policy if exists "anyone can update player" on public.players;
drop policy if exists "anyone can leave player" on public.players;

create policy "players are publicly readable" on public.players
  for select using (true);
create policy "anyone can join as player" on public.players
  for insert with check (
    exists (select 1 from public.game_sessions g where g.id = players.session_id)
  );
create policy "anyone can update player" on public.players
  for update using (
    exists (select 1 from public.game_sessions g where g.id = players.session_id)
  )
  with check (
    exists (select 1 from public.game_sessions g where g.id = players.session_id)
  );
create policy "anyone can leave player" on public.players
  for delete using (true);

-- =====================================================================
-- Grants
-- =====================================================================

grant usage on schema public to anon, authenticated;

grant select on public.cases to anon, authenticated;
grant select on public.locations to anon, authenticated;
grant select on public.clues to anon, authenticated;
grant select on public.game_sessions to anon, authenticated;
grant select on public.teams to anon, authenticated;
grant select on public.players to anon, authenticated;

grant insert, update, delete on public.cases to authenticated;
grant insert, update, delete on public.locations to authenticated;
grant insert, update, delete on public.clues to authenticated;
grant insert, update, delete on public.game_sessions to authenticated;

-- 익명 학생이 팀·플레이어 행을 만들고 갱신할 수 있어야 함
grant insert, update on public.teams to anon, authenticated;
grant insert, update, delete on public.players to anon, authenticated;

-- =====================================================================
-- Realtime publication
-- =====================================================================

do $$
begin
  if not exists (
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) then
    create publication supabase_realtime;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'game_sessions'
  ) then
    alter publication supabase_realtime add table public.game_sessions;
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

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'props_public_read'
  ) then
    create policy props_public_read on storage.objects
      for select
      to anon, authenticated
      using (bucket_id = 'props');
  end if;
end
$$;
