"use client";

import { supabase } from "@/lib/supabase";
import type { ScenarioIncident } from "@/lib/scenario-incident";

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
    incident: ScenarioIncident | null;
  } | null;
};

export type HostSessionDetailsRow = Omit<SessionDetailsRow, "scenarios"> & {
  scenarios: {
    title: string | null;
    description: string | null;
    incident: ScenarioIncident | null;
    solution: string | null;
  } | null;
};

export async function getPlaySessionDetails(sessionId: string) {
  const { data, error } = await supabase
    .from("game_sessions")
    .select("id,join_code,host_id,phase,scenario_id,scenarios(title,description,incident)")
    .eq("id", sessionId)
    .single();
  if (error) throw error;
  return data as unknown as SessionDetailsRow;
}

export async function getHostSessionDetails(sessionId: string) {
  const { data, error } = await supabase
    .from("game_sessions")
    .select("id,join_code,host_id,phase,scenario_id,scenarios(title,description,incident,solution)")
    .eq("id", sessionId)
    .single();
  if (error) throw error;
  return data as unknown as HostSessionDetailsRow;
}

export type SessionPlayerRow = {
  id: string;
  nickname: string | null;
  joined_at: string | null;
  character_id: string | null;
  vote_character_id: string | null;
  characters: { name: string | null; role: string | null; is_culprit: boolean | null } | null;
};

export async function listSessionPlayers(sessionId: string) {
  const { data, error } = await supabase
    .from("players")
    .select("id,nickname,joined_at,character_id,vote_character_id,characters(name,role,is_culprit)")
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
    .select("id,name,role,is_culprit,information,alibi")
    .eq("scenario_id", session.scenario_id)
    .order("name", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function getPlayerVoteCharacterId(playerId: string) {
  const { data, error } = await supabase
    .from("players")
    .select("vote_character_id")
    .eq("id", playerId)
    .single();
  if (error) throw error;
  const v = data?.vote_character_id;
  return typeof v === "string" && v.length > 0 ? v : null;
}

type VoteSummaryCharacter = {
  characterId: string;
  name: string | null;
  role: string | null;
  isCulprit: boolean;
  voteCount: number;
  isTopVoted: boolean;
};

export type HostSessionVoteSummary = {
  totalVotes: number;
  topVoteCount: number;
  culpritArrested: boolean;
  solution: string | null;
  topVotedCharacterNames: string[];
  culpritCharacterNames: string[];
  results: VoteSummaryCharacter[];
};

export type PlaySessionVoteOutcome = {
  culpritArrested: boolean;
};

async function computeSessionVoteSummary(sessionId: string) {
  const { data: session, error: sessionError } = await supabase
    .from("game_sessions")
    .select("scenario_id,scenarios(solution)")
    .eq("id", sessionId)
    .single();

  if (sessionError) throw sessionError;
  if (!session?.scenario_id) {
    throw new Error("This session is not linked to a scenario.");
  }

  const [charactersRes, votesRes] = await Promise.all([
    supabase
      .from("characters")
      .select("id,name,role,is_culprit")
      .eq("scenario_id", session.scenario_id)
      .order("name", { ascending: true }),
    supabase.from("players").select("vote_character_id").eq("session_id", sessionId),
  ]);

  if (charactersRes.error) throw charactersRes.error;
  if (votesRes.error) throw votesRes.error;

  const characters = charactersRes.data ?? [];
  const votes = votesRes.data ?? [];
  const counts = new Map<string, number>();

  for (const character of characters) {
    counts.set(character.id, 0);
  }

  for (const vote of votes) {
    const voteCharacterId = vote.vote_character_id;
    if (voteCharacterId && counts.has(voteCharacterId)) {
      counts.set(voteCharacterId, (counts.get(voteCharacterId) ?? 0) + 1);
    }
  }

  const scenarioRelation = Array.isArray(session.scenarios) ? session.scenarios[0] : session.scenarios;
  const solution = scenarioRelation?.solution ?? null;
  const culpritCharacterIds = characters
    .filter((character) => character.is_culprit === true)
    .map((character) => character.id);

  const topVoteCount = Math.max(0, ...Array.from(counts.values()));
  const topVotedCharacterIds =
    topVoteCount > 0
      ? characters.filter((character) => (counts.get(character.id) ?? 0) === topVoteCount).map((character) => character.id)
      : [];

  const results: VoteSummaryCharacter[] = characters
    .map((character) => ({
      characterId: character.id,
      name: character.name ?? null,
      role: character.role ?? null,
      isCulprit: character.is_culprit === true,
      voteCount: counts.get(character.id) ?? 0,
      isTopVoted: topVotedCharacterIds.includes(character.id),
    }))
    .sort((a, b) => {
      if (b.voteCount !== a.voteCount) return b.voteCount - a.voteCount;
      return (a.name ?? "").localeCompare(b.name ?? "");
    });

  return {
    totalVotes: votes.filter((vote) => typeof vote.vote_character_id === "string" && vote.vote_character_id.length > 0).length,
    topVoteCount,
    culpritArrested: topVotedCharacterIds.some((id) => culpritCharacterIds.includes(id)),
    solution,
    topVotedCharacterNames: results.filter((result) => result.isTopVoted).map((result) => result.name ?? "이름 없음"),
    culpritCharacterNames: results.filter((result) => result.isCulprit).map((result) => result.name ?? "이름 없음"),
    results,
  } satisfies HostSessionVoteSummary;
}

export async function getHostSessionVoteSummary(sessionId: string) {
  return computeSessionVoteSummary(sessionId);
}

export async function getPlaySessionVoteOutcome(sessionId: string) {
  const summary = await computeSessionVoteSummary(sessionId);
  return {
    culpritArrested: summary.culpritArrested,
  } satisfies PlaySessionVoteOutcome;
}

export async function submitPlayerFinalVote(input: { playerId: string; voteCharacterId: string }) {
  const { error } = await supabase
    .from("players")
    .update({ vote_character_id: input.voteCharacterId })
    .eq("id", input.playerId);
  if (error) throw error;
}

export async function getCharacterById(characterId: string) {
  const { data, error } = await supabase.from("characters").select("*").eq("id", characterId).single();
  if (error) throw error;
  return data;
}

export type ScenarioLocationForMap = {
  id: string;
  name: string | null;
  information: Record<string, unknown> | null;
};

export type ScenarioClueForMap = {
  id: string;
  name: string | null;
  information: Record<string, unknown> | null;
  location_id: string | null;
};

/** 플레이어 맵용: 시나리오의 장소·단서 (단서는 location_id로 장소에 묶임) */
export async function getScenarioMapEntities(scenarioId: string) {
  const [locRes, clueRes] = await Promise.all([
    supabase.from("locations").select("id,name,information").eq("scenario_id", scenarioId).order("name", { ascending: true }),
    supabase.from("clues").select("id,name,information,location_id").eq("scenario_id", scenarioId).order("name", { ascending: true }),
  ]);
  if (locRes.error) throw locRes.error;
  if (clueRes.error) throw clueRes.error;
  return {
    locations: (locRes.data ?? []) as ScenarioLocationForMap[],
    clues: (clueRes.data ?? []) as ScenarioClueForMap[],
  };
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
    .select("id,name,role,is_culprit,information,alibi")
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
    .select("id,nickname,character_id,vote_character_id")
    .single();
  if (error) throw error;

  return {
    player: joinedPlayer,
    character: selectedCharacter,
  };
}
