-- =====================================================================
-- Jigsaw — fresh schema
-- Apply on a clean database (or drop legacy tables first).
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Drop legacy tables
-- ---------------------------------------------------------------------
drop table if exists public.player_reports cascade;
drop table if exists public.clues cascade;
drop table if exists public.locations cascade;
drop table if exists public.players cascade;
drop table if exists public.groups cascade;
drop table if exists public.sessions cascade;
drop table if exists public.lessons cascade;
drop table if exists public.cases cascade;
drop table if exists public.game_sessions cascade;

-- ---------------------------------------------------------------------
-- activities — teacher-authored activity (ActivityPack JSON)
-- ---------------------------------------------------------------------
create table public.activities (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  activity_pack jsonb not null,
  group_size int not null default 4 check (group_size >= 2 and group_size <= 12),
  task_count int not null default 0 check (task_count >= 0),
  creator_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- ---------------------------------------------------------------------
-- sessions — live classroom play
-- ---------------------------------------------------------------------
create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities(id) on delete cascade,
  host_id uuid references auth.users(id) on delete set null,
  join_code text not null unique,
  phase text not null default 'waiting'
    check (phase in ('waiting', 'overview', 'expert_group', 'home_group', 'results')),
  status text not null default 'active'
    check (status in ('active', 'ended')),
  created_at timestamptz not null default timezone('utc', now())
);

-- ---------------------------------------------------------------------
-- groups — cooperative worksheet progress
-- ---------------------------------------------------------------------
create table public.groups (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  name text not null,
  worksheet_placements jsonb not null default '[]'::jsonb,
  completed_at timestamptz
);

-- ---------------------------------------------------------------------
-- players — students (anonymous join)
-- ---------------------------------------------------------------------
create table public.players (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  group_id uuid references public.groups(id) on delete set null,
  nickname text not null,
  assigned_role_id text,
  assigned_item_ids jsonb not null default '[]'::jsonb,
  /** 전문가 집단에서 획득한 단어 카드 (개인 인벤토리) */
  word_cards jsonb not null default '[]'::jsonb,
  is_online boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

-- ---------------------------------------------------------------------
-- updated_at trigger (activities)
-- ---------------------------------------------------------------------
create or replace function public.touch_updated_at() returns trigger as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$ language plpgsql;

create trigger activities_touch_updated_at
  before update on public.activities
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------
-- indexes
-- ---------------------------------------------------------------------
create index activities_creator_id_idx on public.activities (creator_id);
create index sessions_activity_id_idx on public.sessions (activity_id);
create index sessions_host_id_idx on public.sessions (host_id);
create index sessions_status_idx on public.sessions (status);
create index groups_session_id_idx on public.groups (session_id);
create index players_session_id_idx on public.players (session_id);
create index players_group_id_idx on public.players (group_id);

-- ---------------------------------------------------------------------
-- row level security
-- ---------------------------------------------------------------------
alter table public.activities enable row level security;
alter table public.sessions enable row level security;
alter table public.groups enable row level security;
alter table public.players enable row level security;

create policy "activities are publicly readable" on public.activities
  for select using (true);
create policy "teachers insert own activities" on public.activities
  for insert to authenticated with check (creator_id = auth.uid());
create policy "teachers update own activities" on public.activities
  for update to authenticated
  using (creator_id = auth.uid()) with check (creator_id = auth.uid());
create policy "teachers delete own activities" on public.activities
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

create policy "groups are publicly readable" on public.groups
  for select using (true);
create policy "anyone can create group" on public.groups
  for insert with check (
    exists (select 1 from public.sessions s where s.id = groups.session_id)
  );
create policy "anyone can update group" on public.groups
  for update using (
    exists (select 1 from public.sessions s where s.id = groups.session_id)
  ) with check (
    exists (select 1 from public.sessions s where s.id = groups.session_id)
  );
create policy "host can delete group" on public.groups
  for delete to authenticated using (
    exists (
      select 1 from public.sessions s
      where s.id = groups.session_id and s.host_id = auth.uid()
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

grant select on public.activities to anon, authenticated;
grant select on public.sessions to anon, authenticated;
grant select on public.groups to anon, authenticated;
grant select on public.players to anon, authenticated;

grant insert, update, delete on public.activities to authenticated;
grant insert, update, delete on public.sessions to authenticated;
grant insert, update on public.groups to anon, authenticated;
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
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'groups'
  ) then
    alter publication supabase_realtime add table public.groups;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'players'
  ) then
    alter publication supabase_realtime add table public.players;
  end if;
end
$$;
