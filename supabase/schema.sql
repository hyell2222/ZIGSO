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
-- 모둠 인원(= 역할 수)과 실전 문항 수는 activity_pack JSON에서 항상 파생되므로
-- 별도 컬럼으로 중복 저장하지 않는다.
create table public.activities (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  activity_pack jsonb not null,
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
    check (phase in ('waiting', 'overview', 'expert_group', 'home_group', 'individual_quiz', 'results')),
  status text not null default 'active'
    check (status in ('active', 'ended')),
  created_at timestamptz not null default timezone('utc', now())
);

-- ---------------------------------------------------------------------
-- groups — home-group membership (STAD team)
-- ---------------------------------------------------------------------
create table public.groups (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  name text not null
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
  /** 전문가 연습 결과 — 기준 점수 (문항 점수 평균) */
  base_score int,
  /** 연습 문항별 결과 [{ questionId, wrongAttempts }] (점수는 wrongAttempts에서 파생) */
  practice_results jsonb not null default '[]'::jsonb,
  /** 연습 완료 시각 */
  practice_submitted_at timestamptz,
  /** 서로 알려주기 — 모둠원 파트 연습 완료 문항 id 목록 (점수 없음) */
  peer_practice_completed jsonb not null default '[]'::jsonb,
  /** 서로 알려주기 단계 완료 시각 */
  home_group_completed_at timestamptz,
  /** 개별 형성평가(실전 문제) 응답 */
  individual_quiz_answers jsonb not null default '[]'::jsonb,
  /** 개별 형성평가 제출 시각 */
  individual_quiz_submitted_at timestamptz,
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
