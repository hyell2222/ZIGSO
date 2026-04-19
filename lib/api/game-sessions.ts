"use client";

import { supabase } from "@/lib/supabase";
import type { ScenarioRecord } from "@/lib/api/scenarios";
import { assignTeamsAndCharacters } from "@/lib/api/play";

export type StartedGameSession = {
  sessionId: string;
  joinCode: string;
  scenarioTitle: string;
};

export type ScenarioPhase =
  | "waiting"
  | "briefing"
  | "investigation"
  | "resolution"
  | "session_end";

function generateJoinCode(length: number) {
  return Math.random().toString(36).slice(2, 2 + length).toUpperCase();
}

export async function startGameSession(scenario: ScenarioRecord, hostId?: string | null) {
  if (!hostId) {
    throw new Error("You must be signed in to start a game.");
  }

  const { data: characters, error: charactersError } = await supabase
    .from("characters")
    .select("id,name")
    .eq("scenario_id", scenario.id)
    .order("name", { ascending: true });

  if (charactersError) throw charactersError;
  if (!characters || characters.length === 0) {
    throw new Error("Selected scenario has no characters.");
  }

  const joinCode = generateJoinCode(6);
  const { data: session, error: sessionError } = await supabase
    .from("game_sessions")
    .insert({
      scenario_id: scenario.id,
      host_id: hostId,
      join_code: joinCode,
      phase: "waiting",
      is_active: true,
    })
    .select("id,join_code")
    .single();

  if (sessionError) throw sessionError;

  return {
    sessionId: session.id,
    joinCode: session.join_code,
    scenarioTitle: scenario.title ?? "Untitled scenario",
  } satisfies StartedGameSession;
}

const PHASE_ORDER: ScenarioPhase[] = [
  "briefing",
  "investigation",
  "resolution",
];

export function getNextPhase(current: string | null): ScenarioPhase | null {
  if (current === "waiting" || current === "session_end") return null;
  const idx = PHASE_ORDER.indexOf((current as ScenarioPhase) ?? "briefing");
  if (idx < 0 || idx >= PHASE_ORDER.length - 1) return null;
  return PHASE_ORDER[idx + 1];
}

export async function beginHostingSession(sessionId: string) {
  await assignTeamsAndCharacters(sessionId);
  const { error } = await supabase
    .from("game_sessions")
    .update({ phase: "briefing" })
    .eq("id", sessionId);
  if (error) throw error;
}

export async function advanceSessionPhase(sessionId: string, nextPhase: ScenarioPhase) {
  const { error } = await supabase
    .from("game_sessions")
    .update({ phase: nextPhase })
    .eq("id", sessionId);
  if (error) throw error;
}

export async function endSession(sessionId: string) {
  const { error } = await supabase
    .from("game_sessions")
    .update({ phase: "session_end", is_active: false })
    .eq("id", sessionId);
  if (error) throw error;
}
