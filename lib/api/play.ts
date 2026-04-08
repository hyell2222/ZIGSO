"use client";

import { supabase } from "@/lib/supabase";

export async function getSessionByJoinCode(joinCode: string) {
  const { data, error } = await supabase
    .from("game_sessions")
    .select("id")
    .eq("join_code", joinCode)
    .single();
  if (error) throw error;
  return data;
}

export type SessionDetailsRow = {
  id: string;
  join_code: string;
  host_id: string | null;
  phase: string | null;
  phase_started_at: string | null;
  ended_at: string | null;
  scenarios: { title: string | null; description: string | null } | null;
};

export async function getSessionDetails(sessionId: string) {
  const { data, error } = await supabase
    .from("game_sessions")
    .select("id,join_code,host_id,phase,phase_started_at,ended_at,scenarios(title,description)")
    .eq("id", sessionId)
    .single();
  if (error) throw error;
  return data as unknown as SessionDetailsRow;
}

export type SessionPlayerRow = {
  id: string;
  nickname: string | null;
  joined_at: string | null;
  team_id: string | null;
  teams: { name: string | null; character_id: string | null } | null;
};

export async function listSessionPlayers(sessionId: string) {
  const { data, error } = await supabase
    .from("players")
    .select("id,nickname,joined_at,team_id,teams(name,character_id)")
    .eq("session_id", sessionId)
    .order("joined_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as SessionPlayerRow[];
}

export async function listSessionTeams(sessionId: string) {
  const { data, error } = await supabase
    .from("teams")
    .select("id,name,character_id")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getTeamById(teamId: string) {
  const { data, error } = await supabase.from("teams").select("*").eq("id", teamId).single();
  if (error) throw error;
  return data;
}

export async function joinPlayerSession(input: {
  session_id: string;
  nickname: string;
}) {
  const { data: teams, error: teamError } = await supabase
    .from("teams")
    .select("id,name,character_id")
    .eq("session_id", input.session_id);
  if (teamError) throw teamError;
  if (!teams || teams.length === 0) {
    throw new Error("No teams found for this session.");
  }

  const { data: existingPlayers, error: playersError } = await supabase
    .from("players")
    .select("team_id")
    .eq("session_id", input.session_id);
  if (playersError) throw playersError;

  const teamCounts = new Map<string, number>();
  for (const team of teams) {
    teamCounts.set(team.id, 0);
  }
  for (const player of existingPlayers ?? []) {
    if (player.team_id && teamCounts.has(player.team_id)) {
      teamCounts.set(player.team_id, (teamCounts.get(player.team_id) ?? 0) + 1);
    }
  }

  const minCount = Math.min(...Array.from(teamCounts.values()));
  const candidateTeams = teams.filter((team) => (teamCounts.get(team.id) ?? 0) === minCount);
  const selectedTeam = candidateTeams[Math.floor(Math.random() * candidateTeams.length)];

  const { data: joinedPlayer, error } = await supabase
    .from("players")
    .insert({
      session_id: input.session_id,
      team_id: selectedTeam.id,
      nickname: input.nickname,
    })
    .select("id,nickname,team_id")
    .single();
  if (error) throw error;

  return {
    player: joinedPlayer,
    team: selectedTeam,
  };
}

export async function submitVote(input: {
  session_id: string;
  team_id: string;
  target_team_id: string;
}) {
  const { error } = await supabase.from("votes").insert(input);
  if (error) throw error;
}
