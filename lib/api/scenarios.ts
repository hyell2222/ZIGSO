"use client";

import { supabase } from "@/lib/supabase";

export type ScenarioRecord = {
  id: string;
  title: string | null;
  description: string | null;
  character_count: number | null;
  difficulty: string | null;
  creator_id?: string | null;
  resolution_mission?: string | null;
  resolution_location_id?: string | null;
  resolution_target_clue_id?: string | null;
  resolution_unlock_clue_ids?: string[] | null;
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
  /**
   * 사건 해결 2단계 정답 prop 표식.
   * - 학생이 맵에서 이 prop 을 조사하면 "발견 성공"이 된다.
   * - 시나리오 전체에서 1개만 의미 있다 (정답 장소의 clue 권장).
   */
  is_resolution_target?: boolean;
  /**
   * 사건 해결 3단계 잠금 해제 아이템 표식.
   * - 학생이 모달에서 이 표식이 달린 clue 들을 정확히 골라 제출해야 한다.
   * - 정확히 3개 권장 (UI 가 강제).
   */
  is_resolution_unlock_item?: boolean;
};

/**
 * 사건 해결 단계 전용 "정답 장소" 입력.
 * - name: 학생이 입력할 장소 이름 (정답 검증용, 1단계)
 * - mission: 학생에게 보여줄 미션 설명 (예: "보물상자 열기")
 * - clues: 정답 장소 안에 배치할 prop/단서들 (location 은 character_id=null 로 새로 만들어진다)
 *   - 이 중 하나의 clue 에 is_resolution_target=true 로 표시하면 2단계 정답 prop 이 된다.
 *   - 잠금 해제 아이템(is_resolution_unlock_item)은 캐릭터 장소 단서일 수도 있어서 별도 배열에 둔다.
 */
export type ScenarioResolutionLocationInput = {
  name: string | null;
  mission?: string | null;
  clues?: ScenarioClueInput[];
};

type CreateScenarioInput = {
  title: string | null;
  description: string | null;
  character_count: number | null;
  difficulty: string | null;
  characters?: ScenarioCharacterInput[];
  locations?: ScenarioLocationInput[];
  clues?: ScenarioClueInput[];
  resolution_location?: ScenarioResolutionLocationInput | null;
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
  /** 캐릭터별 장소만 포함 (정답 장소는 resolutionLocation 으로 별도 노출) */
  locations: ScenarioLocationRow[];
  /** 캐릭터 장소에 배치된 단서만 포함 (정답 장소 단서는 resolutionClues 로 별도 노출) */
  clues: ScenarioClueRow[];
  /** 사건 해결 단계의 정답 장소 (없을 수 있음) */
  resolutionLocation: ScenarioLocationRow | null;
  /** 정답 장소에 배치된 단서들 (정답 장소가 없으면 빈 배열) */
  resolutionClues: ScenarioClueRow[];
};

const SCENARIO_SELECT =
  "id,title,description,character_count,difficulty,creator_id,resolution_location_id,resolution_mission,resolution_target_clue_id,resolution_unlock_clue_ids,created_at,updated_at";

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
 *
 * 사건 해결 정답 장소(resolutionLocation)가 있으면 character_id IS NULL 인 location 으로
 * 별도 삽입하고, scenarios.resolution_location_id 를 그 ID 로 갱신한다.
 * 정답 장소의 단서들은 location_id 가 그 행을 가리키도록 함께 저장한다.
 */
async function rebuildScenarioChildren(
  scenarioId: string,
  characters: ScenarioCharacterInput[],
  locations: ScenarioLocationInput[],
  clues: ScenarioClueInput[],
  resolutionLocation: ScenarioResolutionLocationInput | null | undefined,
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

  // 사건 해결 정답 장소: name 이 있을 때만 location 행으로 삽입한다.
  // (이름이 없으면 학생이 맞힐 수 없어 의미가 없다)
  let resolutionLocationId: string | null = null;
  const resolutionLocationName = normalizeText(resolutionLocation?.name);
  if (resolutionLocationName) {
    const { data: insertedResolution, error: resolutionError } = await supabase
      .from("locations")
      .insert({
        scenario_id: scenarioId,
        name: resolutionLocationName,
        character_id: null,
      })
      .select("id,name")
      .single();
    if (resolutionError) throw resolutionError;
    resolutionLocationId = insertedResolution.id;
  }

  // 캐릭터 장소 단서와 정답 장소 단서를 한 번에 묶어 insert 한다.
  // location_id 결정 우선순위:
  //   1) clue.location_id 가 명시적으로 주어진 경우
  //   2) clue.location_name 이 캐릭터 장소 이름과 매치되는 경우
  //   3) (위 둘 다 없고) clue 가 resolution_location.clues 출신이면 resolutionLocationId
  const locationIdsByName = buildIdMap(
    (insertedLocations ?? []) as Array<{ id: string; name: string | null }>,
  );

  const allClues: Array<{ clue: ScenarioClueInput; resolutionLocationClue: boolean }> = [
    ...clues.map((c) => ({ clue: c, resolutionLocationClue: false })),
    ...(resolutionLocation?.clues ?? []).map((c) => ({ clue: c, resolutionLocationClue: true })),
  ];

  // PostgREST 는 insert 입력 순서대로 select 행을 돌려준다 — 이 순서로 flag 와 매핑한다.
  let targetClueId: string | null = null;
  const unlockClueIds: string[] = [];

  if (allClues.length) {
    const { data: insertedClues, error: cluesError } = await supabase
      .from("clues")
      .insert(
        allClues.map(({ clue, resolutionLocationClue }) => ({
          scenario_id: scenarioId,
          name: normalizeText(clue.name),
          content: normalizeText(clue.content),
          location_id:
            normalizeText(clue.location_id) ??
            locationIdsByName.get(clue.location_name?.trim().toLowerCase() ?? "") ??
            (resolutionLocationClue ? resolutionLocationId : null),
          props: clue.props ?? null,
        })),
      )
      .select("id");

    if (cluesError) throw cluesError;

    const insertedRows = (insertedClues ?? []) as Array<{ id: string }>;
    allClues.forEach(({ clue }, idx) => {
      const newId = insertedRows[idx]?.id;
      if (!newId) return;
      if (clue.is_resolution_target && targetClueId === null) {
        targetClueId = newId;
      }
      if (clue.is_resolution_unlock_item) {
        unlockClueIds.push(newId);
      }
    });
  }

  // scenarios.resolution_* 필드를 항상 동기화 (없으면 NULL/빈 배열).
  // 정답 장소가 없으면 미션/타깃/잠금도 의미가 없으므로 함께 비운다.
  const { error: scenarioPatchError } = await supabase
    .from("scenarios")
    .update({
      resolution_location_id: resolutionLocationId,
      resolution_mission: resolutionLocationId
        ? normalizeText(resolutionLocation?.mission)
        : null,
      resolution_target_clue_id: resolutionLocationId ? targetClueId : null,
      resolution_unlock_clue_ids: resolutionLocationId ? unlockClueIds : [],
    })
    .eq("id", scenarioId);
  if (scenarioPatchError) throw scenarioPatchError;
}

export async function createScenario(input: CreateScenarioInput) {
  const characters = input.characters ?? [];
  const locations = input.locations ?? [];
  const clues = input.clues ?? [];
  const resolutionLocation = input.resolution_location ?? null;

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
    await rebuildScenarioChildren(scenario.id, characters, locations, clues, resolutionLocation);
  } catch (error) {
    await supabase.from("scenarios").delete().eq("id", scenario.id);
    throw error;
  }
}

/**
 * 시나리오 전체 (자식 테이블 포함) 를 가져온다. 수정 페이지 초기 로드용.
 *
 * 정답 장소(resolution_location_id 가 가리키는 location)와 그 단서들은
 * `resolutionLocation` / `resolutionClues` 로 분리해서 노출한다.
 * 나머지 캐릭터 장소 / 단서는 `locations` / `clues` 에 담는다.
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

  const scenario = scenarioRes.data as ScenarioRecord;
  const allLocations = (locationsRes.data ?? []) as ScenarioLocationRow[];
  const allClues = (cluesRes.data ?? []) as ScenarioClueRow[];

  const resolutionLocationId = scenario.resolution_location_id ?? null;
  const resolutionLocation =
    allLocations.find((l) => l.id === resolutionLocationId) ?? null;
  const characterLocations = resolutionLocation
    ? allLocations.filter((l) => l.id !== resolutionLocation.id)
    : allLocations;
  const resolutionClues = resolutionLocation
    ? allClues.filter((c) => c.location_id === resolutionLocation.id)
    : [];
  const characterClues = resolutionLocation
    ? allClues.filter((c) => c.location_id !== resolutionLocation.id)
    : allClues;

  return {
    scenario,
    characters: (charactersRes.data ?? []) as ScenarioCharacterRow[],
    locations: characterLocations,
    clues: characterClues,
    resolutionLocation,
    resolutionClues,
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
  const resolutionLocation = input.resolution_location ?? null;

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

  // resolution_* 가 곧 삭제될 location/clue 을 가리키지 않도록 먼저 비운다.
  // (FK ON DELETE SET NULL 이긴 하지만 unlock_clue_ids 는 배열이라 자동 정리되지 않는다)
  const detach = await supabase
    .from("scenarios")
    .update({
      resolution_location_id: null,
      resolution_target_clue_id: null,
      resolution_unlock_clue_ids: [],
    })
    .eq("id", scenarioId);
  if (detach.error) throw detach.error;

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

  await rebuildScenarioChildren(scenarioId, characters, locations, clues, resolutionLocation);
}

/**
 * 시나리오 삭제. characters/locations/clues 는 cascade 로 같이 삭제된다.
 */
export async function deleteScenario(scenarioId: string) {
  const { error } = await supabase.from("scenarios").delete().eq("id", scenarioId);
  if (error) throw error;
}
