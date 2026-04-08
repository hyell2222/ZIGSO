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
  is_ready: boolean | null;
  is_connected: boolean | null;
  joined_at: string | null;
  team_id: string | null;
  teams: { name: string | null; character_id: string | null } | null;
};

export async function listSessionPlayers(sessionId: string) {
  const { data, error } = await supabase
    .from("players")
    .select("id,nickname,is_ready,is_connected,joined_at,team_id,teams(name,character_id)")
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
  team_id: string;
  nickname: string;
}) {
  const { error } = await supabase.from("players").insert({
    ...input,
    is_ready: true,
    is_connected: true,
  });
  if (error) throw error;
}

export async function submitVote(input: {
  session_id: string;
  team_id: string;
  target_team_id: string;
}) {
  const { error } = await supabase.from("votes").insert(input);
  if (error) throw error;
}
