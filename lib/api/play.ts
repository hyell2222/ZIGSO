"use client";

import { supabase } from "@/lib/supabase";

export async function getSessionByJoinCode(joinCode: string) {
  const { data, error } = await supabase
    .from("game_sessions")
    .select("id,scenario_id")
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
  scenario_id: string | null;
  scenarios: {
    title: string | null;
    description: string | null;
    incident: Record<string, unknown> | null;
    solution: string | null;
  } | null;
};

export async function getSessionDetails(sessionId: string) {
  const { data, error } = await supabase
    .from("game_sessions")
    .select("id,join_code,host_id,phase,scenario_id,scenarios(title,description,incident,solution)")
    .eq("id", sessionId)
    .single();
  if (error) throw error;
  return data as unknown as SessionDetailsRow;
}

export type SessionPlayerRow = {
  id: string;
  nickname: string | null;
  joined_at: string | null;
  character_id: string | null;
  characters: { name: string | null; role: string | null } | null;
};

export async function listSessionPlayers(sessionId: string) {
  const { data, error } = await supabase
    .from("players")
    .select("id,nickname,joined_at,character_id,characters(name,role)")
    .eq("session_id", sessionId)
    .order("joined_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as SessionPlayerRow[];
}

export async function listSessionCharacters(sessionId: string) {
  const { data: session, error: sessionError } = await supabase
    .from("game_sessions")
    .select("scenario_id")
    .eq("id", sessionId)
    .single();

  if (sessionError) throw sessionError;
  if (!session?.scenario_id) return [];

  const { data, error } = await supabase
    .from("characters")
    .select("id,name,role,information,alibi,motive")
    .eq("scenario_id", session.scenario_id)
    .order("name", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function getCharacterById(characterId: string) {
  const { data, error } = await supabase.from("characters").select("*").eq("id", characterId).single();
  if (error) throw error;
  return data;
}

export async function joinPlayerSession(input: {
  session_id: string;
  nickname: string;
}) {
  const { data: session, error: sessionError } = await supabase
    .from("game_sessions")
    .select("scenario_id")
    .eq("id", input.session_id)
    .single();

  if (sessionError) throw sessionError;
  if (!session?.scenario_id) {
    throw new Error("This session is not linked to a scenario.");
  }

  const { data: characters, error: characterError } = await supabase
    .from("characters")
    .select("id,name,role,information,alibi,motive")
    .eq("scenario_id", session.scenario_id);

  if (characterError) throw characterError;
  if (!characters || characters.length === 0) {
    throw new Error("No characters found for this session.");
  }

  const { data: existingPlayers, error: playersError } = await supabase
    .from("players")
    .select("character_id")
    .eq("session_id", input.session_id);
  if (playersError) throw playersError;

  const characterCounts = new Map<string, number>();
  for (const character of characters) {
    characterCounts.set(character.id, 0);
  }
  for (const player of existingPlayers ?? []) {
    if (player.character_id && characterCounts.has(player.character_id)) {
      characterCounts.set(player.character_id, (characterCounts.get(player.character_id) ?? 0) + 1);
    }
  }

  const minCount = Math.min(...Array.from(characterCounts.values()));
  const candidateCharacters = characters.filter((character) => (characterCounts.get(character.id) ?? 0) === minCount);
  const selectedCharacter = candidateCharacters[Math.floor(Math.random() * candidateCharacters.length)];

  const { data: joinedPlayer, error } = await supabase
    .from("players")
    .insert({
      session_id: input.session_id,
      character_id: selectedCharacter.id,
      nickname: input.nickname,
    })
    .select("id,nickname,character_id")
    .single();
  if (error) throw error;

  return {
    player: joinedPlayer,
    character: selectedCharacter,
  };
}
