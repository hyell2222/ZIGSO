create extension if not exists pgcrypto;

-- =====================================================================
-- Tables (구조 확정 - 컬럼 추가/변경 금지)
-- =====================================================================

create table if not exists public.scenarios (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  character_count integer,
  difficulty text check (difficulty in ('Easy', 'Normal', 'Hard')),
  creator_id uuid,
  created_at timestamptz default timezone('utc', now()),
  updated_at timestamptz default timezone('utc', now())
);

create table if not exists public.characters (
  id uuid primary key default gen_random_uuid(),
  scenario_id uuid references public.scenarios(id) on delete cascade,
  name text,
  role text
);

create table if not exists public.locations (
  id uuid primary key default gen_random_uuid(),
  scenario_id uuid references public.scenarios(id) on delete cascade,
  name text,
  character_id uuid references public.characters(id) on delete set null
);

create table if not exists public.clues (
  id uuid primary key default gen_random_uuid(),
  scenario_id uuid references public.scenarios(id) on delete cascade,
  location_id uuid references public.locations(id) on delete set null,
  name text,
  content text
);

create table if not exists public.game_sessions (
  id uuid primary key default gen_random_uuid(),
  scenario_id uuid references public.scenarios(id) on delete set null,
  host_id uuid references auth.users(id) on delete set null,
  join_code text unique not null,
  phase text default 'waiting' check (phase in ('waiting', 'briefing', 'investigation', 'resolution', 'session_end')),
  is_active boolean default true,
  created_at timestamptz default timezone('utc', now())
);

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.game_sessions(id) on delete cascade,
  name text,
  found_clue_ids uuid[] not null default '{}',
  is_solved boolean default false,
  solved_at timestamptz
);

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  nickname text,
  session_id uuid references public.game_sessions(id) on delete cascade,
  team_id uuid references public.teams(id) on delete set null,
  character_id uuid references public.characters(id) on delete set null,
  is_solved boolean default false,
  solved_at timestamptz
);

-- =====================================================================
-- updated_at 자동 갱신 트리거 (scenarios)
-- =====================================================================

create or replace function public.touch_updated_at() returns trigger as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$ language plpgsql;

drop trigger if exists scenarios_touch_updated_at on public.scenarios;
create trigger scenarios_touch_updated_at
  before update on public.scenarios
  for each row execute function public.touch_updated_at();

-- =====================================================================
-- Indexes
-- =====================================================================

create unique index if not exists game_sessions_join_code_key on public.game_sessions (join_code);
create index if not exists scenarios_creator_id_idx on public.scenarios (creator_id);
create index if not exists characters_scenario_id_idx on public.characters (scenario_id);
create index if not exists locations_scenario_id_idx on public.locations (scenario_id);
create index if not exists locations_character_id_idx on public.locations (character_id);
create index if not exists clues_scenario_id_idx on public.clues (scenario_id);
create index if not exists clues_location_id_idx on public.clues (location_id);
create index if not exists game_sessions_scenario_id_idx on public.game_sessions (scenario_id);
create index if not exists game_sessions_host_id_idx on public.game_sessions (host_id);
create index if not exists game_sessions_active_idx on public.game_sessions (is_active);
create index if not exists teams_session_id_idx on public.teams (session_id);
create index if not exists players_session_id_idx on public.players (session_id);
create index if not exists players_team_id_idx on public.players (team_id);
create index if not exists players_character_id_idx on public.players (character_id);

-- =====================================================================
-- Row Level Security
-- =====================================================================

alter table if exists public.scenarios enable row level security;
alter table if exists public.characters enable row level security;
alter table if exists public.locations enable row level security;
alter table if exists public.clues enable row level security;
alter table if exists public.game_sessions enable row level security;
alter table if exists public.teams enable row level security;
alter table if exists public.players enable row level security;

-- ---------- scenarios ----------
drop policy if exists "scenarios are publicly readable" on public.scenarios;
drop policy if exists "teachers insert own scenarios" on public.scenarios;
drop policy if exists "teachers update own scenarios" on public.scenarios;
drop policy if exists "teachers delete own scenarios" on public.scenarios;

create policy "scenarios are publicly readable" on public.scenarios
  for select using (true);
create policy "teachers insert own scenarios" on public.scenarios
  for insert to authenticated
  with check (creator_id = auth.uid());
create policy "teachers update own scenarios" on public.scenarios
  for update to authenticated
  using (creator_id = auth.uid())
  with check (creator_id = auth.uid());
create policy "teachers delete own scenarios" on public.scenarios
  for delete to authenticated
  using (creator_id = auth.uid());

-- ---------- characters / locations / clues (시나리오 소유자만 관리, 모두 읽기 가능) ----------
drop policy if exists "characters are publicly readable" on public.characters;
drop policy if exists "owners manage characters" on public.characters;

create policy "characters are publicly readable" on public.characters
  for select using (true);
create policy "owners manage characters" on public.characters
  for all to authenticated
  using (
    exists (
      select 1 from public.scenarios s
      where s.id = characters.scenario_id and s.creator_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.scenarios s
      where s.id = characters.scenario_id and s.creator_id = auth.uid()
    )
  );

drop policy if exists "locations are publicly readable" on public.locations;
drop policy if exists "owners manage locations" on public.locations;

create policy "locations are publicly readable" on public.locations
  for select using (true);
create policy "owners manage locations" on public.locations
  for all to authenticated
  using (
    exists (
      select 1 from public.scenarios s
      where s.id = locations.scenario_id and s.creator_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.scenarios s
      where s.id = locations.scenario_id and s.creator_id = auth.uid()
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
      select 1 from public.scenarios s
      where s.id = clues.scenario_id and s.creator_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.scenarios s
      where s.id = clues.scenario_id and s.creator_id = auth.uid()
    )
  );

-- ---------- game_sessions ----------
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

-- ---------- teams ----------
-- 호스트가 팀을 생성하고, 누구나(익명 학생 포함) 팀 상태를 갱신할 수 있음
-- (sb-anon 키로 학생이 보물 발견 시 is_solved 갱신해야 하므로 update 는 public 허용)
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

-- ---------- players ----------
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

grant select on public.scenarios to anon, authenticated;
grant select on public.characters to anon, authenticated;
grant select on public.locations to anon, authenticated;
grant select on public.clues to anon, authenticated;
grant select on public.game_sessions to anon, authenticated;
grant select on public.teams to anon, authenticated;
grant select on public.players to anon, authenticated;

grant insert, update, delete on public.scenarios to authenticated;
grant insert, update, delete on public.characters to authenticated;
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
