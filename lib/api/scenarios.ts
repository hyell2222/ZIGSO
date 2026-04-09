"use client";

import { supabase } from "@/lib/supabase";

type JsonObject = Record<string, unknown>;

export type ScenarioRecord = {
  id: string;
  title: string | null;
  description: string | null;
  character_count: number | null;
  difficulty: string | null;
  incident: JsonObject | null;
  solution: string | null;
  creator_id?: string | null;
};

export type ScenarioCharacterInput = {
  name?: string | null;
  role?: string | null;
  information?: JsonObject | null;
  alibi?: string | null;
  motive?: JsonObject | null;
};

export type ScenarioLocationInput = {
  name?: string | null;
  information?: JsonObject | null;
};

export type ScenarioClueInput = {
  name?: string | null;
  information?: JsonObject | null;
  character_id?: string | null;
  location_id?: string | null;
  character_name?: string | null;
  location_name?: string | null;
};

type CreateScenarioInput = {
  title: string | null;
  description: string | null;
  character_count: number | null;
  difficulty: string | null;
  incident: JsonObject | null;
  solution: string | null;
  characters?: ScenarioCharacterInput[];
  locations?: ScenarioLocationInput[];
  clues?: ScenarioClueInput[];
  creator_id?: string | null;
};

function normalizeText(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function buildIdMap(rows: Array<{ id: string; name: string | null }>) {
  return new Map(
    rows
      .map((row) => [row.name?.trim().toLowerCase(), row.id] as const)
      .filter((entry): entry is [string, string] => Boolean(entry[0] && entry[1])),
  );
}

export async function listScenarios(teacherId: string) {
  const { data, error } = await supabase
    .from("scenarios")
    .select("id,title,description,character_count,difficulty,incident,solution,creator_id")
    .eq("creator_id", teacherId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ScenarioRecord[];
}

export {
  advanceSessionPhase,
  beginHostingSession,
  endSession,
  getNextPhase,
  type ScenarioPhase,
  startGameSession,
} from "@/lib/api/game-sessions";
export type { StartedGameSession } from "@/lib/api/game-sessions";

export async function createScenario(input: CreateScenarioInput) {
  const characters = input.characters ?? [];
  const locations = input.locations ?? [];
  const clues = input.clues ?? [];

  const { data: scenario, error: scenarioError } = await supabase
    .from("scenarios")
    .insert({
      title: normalizeText(input.title),
      description: normalizeText(input.description),
      character_count: characters.length || input.character_count,
      difficulty: normalizeText(input.difficulty),
      incident: input.incident,
      solution: normalizeText(input.solution),
      creator_id: input.creator_id ?? null,
    })
    .select("id")
    .single();

  if (scenarioError) throw scenarioError;

  try {
    const { data: insertedCharacters, error: charactersError } = characters.length
      ? await supabase
          .from("characters")
          .insert(
            characters.map((character) => ({
              scenario_id: scenario.id,
              name: normalizeText(character.name),
              role: normalizeText(character.role),
              information: character.information ?? null,
              alibi: normalizeText(character.alibi),
              motive: character.motive ?? null,
            })),
          )
          .select("id,name")
      : { data: [], error: null };

    if (charactersError) throw charactersError;

    const { data: insertedLocations, error: locationsError } = locations.length
      ? await supabase
          .from("locations")
          .insert(
            locations.map((location) => ({
              scenario_id: scenario.id,
              name: normalizeText(location.name),
              information: location.information ?? null,
            })),
          )
          .select("id,name")
      : { data: [], error: null };

    if (locationsError) throw locationsError;

    if (clues.length) {
      const characterIdsByName = buildIdMap((insertedCharacters ?? []) as Array<{ id: string; name: string | null }>);
      const locationIdsByName = buildIdMap((insertedLocations ?? []) as Array<{ id: string; name: string | null }>);

      const { error: cluesError } = await supabase.from("clues").insert(
        clues.map((clue) => ({
          scenario_id: scenario.id,
          name: normalizeText(clue.name),
          information: clue.information ?? null,
          character_id:
            normalizeText(clue.character_id) ??
            characterIdsByName.get(clue.character_name?.trim().toLowerCase() ?? "") ??
            null,
          location_id:
            normalizeText(clue.location_id) ??
            locationIdsByName.get(clue.location_name?.trim().toLowerCase() ?? "") ??
            null,
        })),
      );

      if (cluesError) throw cluesError;
    }
  } catch (error) {
    await supabase.from("scenarios").delete().eq("id", scenario.id);
    throw error;
  }
}
