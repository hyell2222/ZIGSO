"use client";

import { supabase } from "@/lib/supabase";
import type { ScenarioRecord } from "@/lib/api/scenarios";

type ScenarioCharacter = {
  id?: string;
  name?: string;
};

export type StartedGameSession = {
  sessionId: string;
  joinCode: string;
  scenarioTitle: string;
};

export type ScenarioPhase =
  | "role_assignment"
  | "first_investigation"
  | "briefing"
  | "second_investigation"
  | "final_vote";

function generateJoinCode(length: number) {
  return Math.random().toString(36).slice(2, 2 + length).toUpperCase();
}

export async function startGameSession(scenario: ScenarioRecord, hostId?: string | null) {
  if (!hostId) {
    throw new Error("You must be signed in to start a game.");
  }

  const characters = Array.isArray(scenario.data?.characters)
    ? (scenario.data.characters as ScenarioCharacter[])
    : [];

  if (characters.length === 0) {
    throw new Error("Selected scenario has no characters in data.characters.");
  }

  const joinCode = generateJoinCode(6);
  const { data: session, error: sessionError } = await supabase
    .from("game_sessions")
    .insert({
      scenario_id: scenario.id,
      host_id: hostId,
      join_code: joinCode,
      max_teams: scenario.character_count ?? null,
      phase: "role_assignment",
      phase_started_at: null,
    })
    .select("id,join_code")
    .single();

  if (sessionError) throw sessionError;

  const teams = characters.map((character, index) => ({
    session_id: session.id,
    character_id: character.id?.trim() || `character_${index + 1}`,
    name: character.name?.trim() || `Character ${index + 1}`,
  }));

  const { error: teamError } = await supabase.from("teams").insert(teams);
  if (teamError) throw teamError;

  return {
    sessionId: session.id,
    joinCode: session.join_code,
    scenarioTitle: scenario.title ?? "Untitled scenario",
  } satisfies StartedGameSession;
}

const PHASE_ORDER: ScenarioPhase[] = [
  "role_assignment",
  "first_investigation",
  "briefing",
  "second_investigation",
  "final_vote",
];

export function getNextPhase(current: string | null): ScenarioPhase | null {
  const idx = PHASE_ORDER.indexOf((current as ScenarioPhase) ?? "role_assignment");
  if (idx < 0 || idx >= PHASE_ORDER.length - 1) return null;
  return PHASE_ORDER[idx + 1];
}

export async function beginHostingSession(sessionId: string) {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("game_sessions")
    .update({
      phase: "role_assignment",
      phase_started_at: now,
      started_at: now,
    })
    .eq("id", sessionId);
  if (error) throw error;
}

export async function advanceSessionPhase(sessionId: string, nextPhase: ScenarioPhase) {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("game_sessions")
    .update({ phase: nextPhase, phase_started_at: now })
    .eq("id", sessionId);
  if (error) throw error;
}

export async function endSession(sessionId: string) {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("game_sessions")
    .update({ ended_at: now, phase: "final_vote", phase_started_at: now })
    .eq("id", sessionId);
  if (error) throw error;
}
