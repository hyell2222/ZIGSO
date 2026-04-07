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

export async function getSessionDetails(sessionId: string) {
  const { data, error } = await supabase
    .from("game_sessions")
    .select("id,status,join_code,scenarios(title,description)")
    .eq("id", sessionId)
    .single();
  if (error) throw error;
  return data;
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
