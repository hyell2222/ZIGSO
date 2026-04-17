create extension if not exists pgcrypto;

create table if not exists public.scenarios (
  id uuid primary key default gen_random_uuid(),
  title text,
  description text,
  character_count integer,
  difficulty text,
  created_at timestamptz default timezone('utc', now()),
  creator_id uuid,
  incident jsonb,
  solution text
);

create table if not exists public.characters (
  id uuid primary key default gen_random_uuid(),
  scenario_id uuid,
  name text,
  role text,
  is_culprit boolean default false,
  information jsonb,
  alibi jsonb,
);

create table if not exists public.locations (
  id uuid primary key default gen_random_uuid(),
  scenario_id uuid,
  name text,
  information jsonb
);

create table if not exists public.clues (
  id uuid primary key default gen_random_uuid(),
  scenario_id uuid,
  name text,
  information jsonb,
  character_id uuid,
  location_id uuid
);

create table if not exists public.game_sessions (
  id uuid primary key default gen_random_uuid(),
  scenario_id uuid,
  host_id uuid,
  join_code text not null,
  created_at timestamptz default timezone('utc', now()),
  phase text
);

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  session_id uuid,
  character_id uuid,
  nickname text,
  joined_at timestamptz default timezone('utc', now()),
  vote_character_id uuid
);

alter table if exists public.players
  add column if not exists vote_character_id uuid;

alter table if exists public.characters
  add column if not exists is_culprit boolean default false;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'characters'
      and column_name = 'alibi'
      and udt_name <> 'jsonb'
  ) then
    alter table public.characters
      alter column alibi type jsonb
      using case
        when alibi is null or btrim(alibi) = '' then null
        when left(btrim(alibi), 1) in ('{', '[') then alibi::jsonb
        else jsonb_build_object('timeline', jsonb_build_array(
          jsonb_build_object('time', null, 'behavior', alibi, 'location', null)
        ))
      end;
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'characters_scenario_id_fkey'
  ) then
    alter table public.characters
      add constraint characters_scenario_id_fkey
      foreign key (scenario_id) references public.scenarios(id) on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'locations_scenario_id_fkey'
  ) then
    alter table public.locations
      add constraint locations_scenario_id_fkey
      foreign key (scenario_id) references public.scenarios(id) on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'clues_scenario_id_fkey'
  ) then
    alter table public.clues
      add constraint clues_scenario_id_fkey
      foreign key (scenario_id) references public.scenarios(id) on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'clues_character_id_fkey'
  ) then
    alter table public.clues
      add constraint clues_character_id_fkey
      foreign key (character_id) references public.characters(id) on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'clues_location_id_fkey'
  ) then
    alter table public.clues
      add constraint clues_location_id_fkey
      foreign key (location_id) references public.locations(id) on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'game_sessions_scenario_id_fkey'
  ) then
    alter table public.game_sessions
      add constraint game_sessions_scenario_id_fkey
      foreign key (scenario_id) references public.scenarios(id) on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'players_session_id_fkey'
  ) then
    alter table public.players
      add constraint players_session_id_fkey
      foreign key (session_id) references public.game_sessions(id) on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'players_character_id_fkey'
  ) then
    alter table public.players
      add constraint players_character_id_fkey
      foreign key (character_id) references public.characters(id) on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'players_vote_character_id_fkey'
  ) then
    alter table public.players
      add constraint players_vote_character_id_fkey
      foreign key (vote_character_id) references public.characters(id) on delete set null;
  end if;
end
$$;

create unique index if not exists game_sessions_join_code_key on public.game_sessions (join_code);
create index if not exists scenarios_creator_id_idx on public.scenarios (creator_id);
create index if not exists characters_scenario_id_idx on public.characters (scenario_id);
create index if not exists locations_scenario_id_idx on public.locations (scenario_id);
create index if not exists clues_scenario_id_idx on public.clues (scenario_id);
create index if not exists clues_character_id_idx on public.clues (character_id);
create index if not exists clues_location_id_idx on public.clues (location_id);
create index if not exists game_sessions_scenario_id_idx on public.game_sessions (scenario_id);
create index if not exists game_sessions_host_id_idx on public.game_sessions (host_id);
create index if not exists players_session_id_idx on public.players (session_id);
create index if not exists players_character_id_idx on public.players (character_id);
create index if not exists players_vote_character_id_idx on public.players (vote_character_id);

alter table if exists public.scenarios enable row level security;
alter table if exists public.characters enable row level security;
alter table if exists public.locations enable row level security;
alter table if exists public.clues enable row level security;
alter table if exists public.game_sessions enable row level security;
alter table if exists public.players enable row level security;

drop policy if exists "public read scenarios" on public.scenarios;
drop policy if exists "teachers can insert scenarios" on public.scenarios;
drop policy if exists "teachers can update own scenarios" on public.scenarios;
drop policy if exists "teachers can delete own scenarios" on public.scenarios;

drop policy if exists "public read characters" on public.characters;
drop policy if exists "owners manage characters" on public.characters;
drop policy if exists "public read locations" on public.locations;
drop policy if exists "owners manage locations" on public.locations;
drop policy if exists "public read clues" on public.clues;
drop policy if exists "owners manage clues" on public.clues;

drop policy if exists "public read sessions" on public.game_sessions;
drop policy if exists "hosts can insert sessions" on public.game_sessions;
drop policy if exists "hosts can update own sessions" on public.game_sessions;
drop policy if exists "hosts can delete own sessions" on public.game_sessions;

drop policy if exists "players readable" on public.players;
drop policy if exists "players can join" on public.players;
drop policy if exists "players can set vote_character_id" on public.players;

create policy "public read scenarios" on public.scenarios
  for select using (true);
create policy "teachers can insert scenarios" on public.scenarios
  for insert to authenticated with check (creator_id = auth.uid());
create policy "teachers can update own scenarios" on public.scenarios
  for update to authenticated using (creator_id = auth.uid()) with check (creator_id = auth.uid());
create policy "teachers can delete own scenarios" on public.scenarios
  for delete to authenticated using (creator_id = auth.uid());

create policy "public read characters" on public.characters
  for select using (true);
create policy "owners manage characters" on public.characters
  for all to authenticated using (
    exists (
      select 1
      from public.scenarios
      where scenarios.id = characters.scenario_id
        and scenarios.creator_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.scenarios
      where scenarios.id = characters.scenario_id
        and scenarios.creator_id = auth.uid()
    )
  );

create policy "public read locations" on public.locations
  for select using (true);
create policy "owners manage locations" on public.locations
  for all to authenticated using (
    exists (
      select 1
      from public.scenarios
      where scenarios.id = locations.scenario_id
        and scenarios.creator_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.scenarios
      where scenarios.id = locations.scenario_id
        and scenarios.creator_id = auth.uid()
    )
  );

create policy "public read clues" on public.clues
  for select using (true);
create policy "owners manage clues" on public.clues
  for all to authenticated using (
    exists (
      select 1
      from public.scenarios
      where scenarios.id = clues.scenario_id
        and scenarios.creator_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.scenarios
      where scenarios.id = clues.scenario_id
        and scenarios.creator_id = auth.uid()
    )
  );

create policy "public read sessions" on public.game_sessions
  for select using (true);
create policy "hosts can insert sessions" on public.game_sessions
  for insert to authenticated with check (host_id = auth.uid());
create policy "hosts can update own sessions" on public.game_sessions
  for update to authenticated using (host_id = auth.uid()) with check (host_id = auth.uid());
create policy "hosts can delete own sessions" on public.game_sessions
  for delete to authenticated using (host_id = auth.uid());

create policy "players readable" on public.players
  for select using (true);
create policy "players can join" on public.players
  for insert with check (true);
/* anon: player row id로 최종 투표만 기록 — 테이블 권한으로 vote_character_id 컬럼만 UPDATE 허용 */
create policy "players can set vote_character_id" on public.players
  for update
  to anon, authenticated
  using (true)
  with check (true);

grant usage on schema public to anon, authenticated;
grant select on public.scenarios to anon, authenticated;
grant select on public.characters to anon, authenticated;
grant select on public.locations to anon, authenticated;
grant select on public.clues to anon, authenticated;
grant select on public.game_sessions to anon, authenticated;
grant select on public.players to anon, authenticated;
grant insert on public.players to anon, authenticated;
grant update (vote_character_id) on public.players to anon, authenticated;
grant insert, update, delete on public.scenarios to authenticated;
grant insert, update, delete on public.characters to authenticated;
grant insert, update, delete on public.locations to authenticated;
grant insert, update, delete on public.clues to authenticated;
grant insert, update, delete on public.game_sessions to authenticated;
