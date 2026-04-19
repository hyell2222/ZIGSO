"use client";

import { supabase } from "@/lib/supabase";

export type ScenarioRecord = {
  id: string;
  title: string | null;
  description: string | null;
  character_count: number | null;
  difficulty: string | null;
  creator_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type ScenarioCharacterInput = {
  name?: string | null;
  role?: string | null;
};

export type ScenarioLocationInput = {
  name?: string | null;
  character_id?: string | null;
  character_name?: string | null;
};

export type ScenarioClueInput = {
  name?: string | null;
  content?: string | null;
  location_id?: string | null;
  location_name?: string | null;
};

type CreateScenarioInput = {
  title: string | null;
  description: string | null;
  character_count: number | null;
  difficulty: string | null;
  characters?: ScenarioCharacterInput[];
  locations?: ScenarioLocationInput[];
  clues?: ScenarioClueInput[];
  creator_id?: string | null;
};

const SCENARIO_SELECT =
  "id,title,description,character_count,difficulty,creator_id,created_at,updated_at";

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
    .select(SCENARIO_SELECT)
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
            })),
          )
          .select("id,name")
      : { data: [], error: null };

    if (charactersError) throw charactersError;

    const characterIdsByName = buildIdMap(
      (insertedCharacters ?? []) as Array<{ id: string; name: string | null }>,
    );

    const { data: insertedLocations, error: locationsError } = locations.length
      ? await supabase
          .from("locations")
          .insert(
            locations.map((location) => ({
              scenario_id: scenario.id,
              name: normalizeText(location.name),
              character_id:
                normalizeText(location.character_id) ??
                characterIdsByName.get(location.character_name?.trim().toLowerCase() ?? "") ??
                null,
            })),
          )
          .select("id,name")
      : { data: [], error: null };

    if (locationsError) throw locationsError;

    if (clues.length) {
      const locationIdsByName = buildIdMap(
        (insertedLocations ?? []) as Array<{ id: string; name: string | null }>,
      );

      const { error: cluesError } = await supabase.from("clues").insert(
        clues.map((clue) => ({
          scenario_id: scenario.id,
          name: normalizeText(clue.name),
          content: normalizeText(clue.content),
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
