drop policy if exists "teachers can delete own scenarios" on public.scenarios;
drop policy if exists "teachers can insert scenarios" on public.scenarios;
drop policy if exists "teachers can update own scenarios" on public.scenarios;
drop policy if exists "teachers can view own scenarios" on public.scenarios;
drop policy if exists "host can manage sessions" on public.game_sessions;
drop policy if exists "allow session lookup" on public.game_sessions;
drop policy if exists "host can manage teams" on public.teams;
drop policy if exists "allow teams lookup" on public.teams;
drop policy if exists "players readable" on public.players;
drop policy if exists "players can join" on public.players;
drop policy if exists "votes readable" on public.votes;
drop policy if exists "votes insertable" on public.votes;
drop policy if exists "clues readable" on public.discovered_clues;
drop policy if exists "clues insertable" on public.discovered_clues;

drop policy if exists "teacher_manage_scenarios" on public.scenarios;
drop policy if exists "teacher_manage_sessions" on public.game_sessions;
drop policy if exists "teacher_manage_teams" on public.teams;
drop policy if exists "teacher_manage_players" on public.players;
drop policy if exists "teacher_manage_votes" on public.votes;
drop policy if exists "teacher_manage_discovered_clues" on public.discovered_clues;
drop policy if exists "students_read_scenarios" on public.scenarios;
drop policy if exists "students_read_sessions" on public.game_sessions;
drop policy if exists "students_read_teams" on public.teams;
drop policy if exists "students_read_players" on public.players;
drop policy if exists "students_join_players" on public.players;
drop policy if exists "students_join_players_authenticated" on public.players;
drop policy if exists "students_vote" on public.votes;
drop policy if exists "students_discover_clues" on public.discovered_clues;

create policy "teachers can view own scenarios" on public.scenarios
  for select to authenticated using (teacher_id = auth.uid());
create policy "teachers can insert scenarios" on public.scenarios
  for insert to authenticated with check (teacher_id = auth.uid());
create policy "teachers can update own scenarios" on public.scenarios
  for update to authenticated using (teacher_id = auth.uid());
create policy "teachers can delete own scenarios" on public.scenarios
  for delete to authenticated using (teacher_id = auth.uid());

create policy "host can manage sessions" on public.game_sessions
  for all to authenticated using (host_id = auth.uid());
create policy "allow session lookup" on public.game_sessions
  for select to anon using (true);

create policy "host can manage teams" on public.teams
  for all to authenticated using (
    session_id in (
      select game_sessions.id
      from public.game_sessions
      where game_sessions.host_id = auth.uid()
    )
  );
-- Students (anon) need read access to list teams for a session when joining.
create policy "allow teams lookup" on public.teams
  for select to anon using (true);

-- Count existing players + INSERT ... RETURNING both require SELECT on players.
-- Logged-in browsers use the authenticated role, so INSERT cannot be "to anon" only.
create policy "players readable" on public.players
  for select using (true);
create policy "players can join" on public.players
  for insert with check (true);

create policy "votes readable" on public.votes
  for select to anon using (true);
create policy "votes insertable" on public.votes
  for insert to anon with check (true);

create policy "clues readable" on public.discovered_clues
  for select to anon using (true);
create policy "clues insertable" on public.discovered_clues
  for insert to anon with check (true);

grant usage on schema public to anon, authenticated;
grant select on public.game_sessions to anon;
grant select on public.teams to anon;
grant select on public.players to anon, authenticated;
grant select on public.votes to anon;
grant select on public.discovered_clues to anon;
grant insert on public.players to anon, authenticated;
grant insert on public.votes to anon;
grant insert on public.discovered_clues to anon;
