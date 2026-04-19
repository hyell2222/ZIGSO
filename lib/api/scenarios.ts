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

export type ScenarioClueProps = {
  x: number;
  y: number;
  /** prop 에셋 파일명(확장자 생략 시 .svg). Supabase Storage / public/assets/props/ 에서 로딩 */
  asset?: string;
  w?: number;
  h?: number;
};

export type ScenarioClueInput = {
  name?: string | null;
  content?: string | null;
  location_id?: string | null;
  location_name?: string | null;
  props?: ScenarioClueProps | null;
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

export type ScenarioCharacterRow = {
  id: string;
  name: string | null;
  role: string | null;
};

export type ScenarioLocationRow = {
  id: string;
  name: string | null;
  character_id: string | null;
};

export type ScenarioClueRow = {
  id: string;
  name: string | null;
  content: string | null;
  location_id: string | null;
  props: ScenarioClueProps | null;
};

export type ScenarioFullData = {
  scenario: ScenarioRecord;
  characters: ScenarioCharacterRow[];
  locations: ScenarioLocationRow[];
  clues: ScenarioClueRow[];
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

/**
 * 시나리오 ID 가 주어졌을 때 자식 테이블(characters/locations/clues) 을 다시 채워 넣는다.
 * createScenario / updateScenario 가 공통으로 사용.
 *
 * 호출 전제:
 * - scenarios 행은 이미 존재한다 (insert 또는 update 직후).
 * - 기존 자식 행은 이미 비워졌다고 가정 (update 시 별도 정리 필요).
 */
async function rebuildScenarioChildren(
  scenarioId: string,
  characters: ScenarioCharacterInput[],
  locations: ScenarioLocationInput[],
  clues: ScenarioClueInput[],
) {
  const { data: insertedCharacters, error: charactersError } = characters.length
    ? await supabase
        .from("characters")
        .insert(
          characters.map((character) => ({
            scenario_id: scenarioId,
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
            scenario_id: scenarioId,
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
        scenario_id: scenarioId,
        name: normalizeText(clue.name),
        content: normalizeText(clue.content),
        location_id:
          normalizeText(clue.location_id) ??
          locationIdsByName.get(clue.location_name?.trim().toLowerCase() ?? "") ??
          null,
        props: clue.props ?? null,
      })),
    );

    if (cluesError) throw cluesError;
  }
}

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
    await rebuildScenarioChildren(scenario.id, characters, locations, clues);
  } catch (error) {
    await supabase.from("scenarios").delete().eq("id", scenario.id);
    throw error;
  }
}

/**
 * 시나리오 전체 (자식 테이블 포함) 를 가져온다. 수정 페이지 초기 로드용.
 */
export async function getScenarioFull(scenarioId: string): Promise<ScenarioFullData> {
  const [scenarioRes, charactersRes, locationsRes, cluesRes] = await Promise.all([
    supabase.from("scenarios").select(SCENARIO_SELECT).eq("id", scenarioId).single(),
    supabase
      .from("characters")
      .select("id,name,role")
      .eq("scenario_id", scenarioId)
      .order("name", { ascending: true }),
    supabase
      .from("locations")
      .select("id,name,character_id")
      .eq("scenario_id", scenarioId)
      .order("name", { ascending: true }),
    supabase
      .from("clues")
      .select("id,name,content,location_id,props")
      .eq("scenario_id", scenarioId),
  ]);

  if (scenarioRes.error) throw scenarioRes.error;
  if (charactersRes.error) throw charactersRes.error;
  if (locationsRes.error) throw locationsRes.error;
  if (cluesRes.error) throw cluesRes.error;

  return {
    scenario: scenarioRes.data as ScenarioRecord,
    characters: (charactersRes.data ?? []) as ScenarioCharacterRow[],
    locations: (locationsRes.data ?? []) as ScenarioLocationRow[],
    clues: (cluesRes.data ?? []) as ScenarioClueRow[],
  };
}

/**
 * 시나리오를 통째로 갱신한다. (자식 행은 모두 비우고 새로 채움 — 단순/안전한 방식)
 */
export async function updateScenario(
  scenarioId: string,
  input: Omit<CreateScenarioInput, "creator_id">,
) {
  const characters = input.characters ?? [];
  const locations = input.locations ?? [];
  const clues = input.clues ?? [];

  const { error: updateError } = await supabase
    .from("scenarios")
    .update({
      title: normalizeText(input.title),
      description: normalizeText(input.description),
      character_count: characters.length || input.character_count,
      difficulty: normalizeText(input.difficulty),
      updated_at: new Date().toISOString(),
    })
    .eq("id", scenarioId);

  if (updateError) throw updateError;

  // 자식 행 정리 (FK 의존 순서: clues → locations → characters)
  const cluesDel = await supabase.from("clues").delete().eq("scenario_id", scenarioId);
  if (cluesDel.error) throw cluesDel.error;
  const locDel = await supabase.from("locations").delete().eq("scenario_id", scenarioId);
  if (locDel.error) throw locDel.error;
  const charDel = await supabase
    .from("characters")
    .delete()
    .eq("scenario_id", scenarioId);
  if (charDel.error) throw charDel.error;

  await rebuildScenarioChildren(scenarioId, characters, locations, clues);
}

/**
 * 시나리오 삭제. characters/locations/clues 는 cascade 로 같이 삭제된다.
 */
export async function deleteScenario(scenarioId: string) {
  const { error } = await supabase.from("scenarios").delete().eq("id", scenarioId);
  if (error) throw error;
}
