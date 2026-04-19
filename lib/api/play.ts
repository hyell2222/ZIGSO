"use client";

import { supabase } from "@/lib/supabase";

// =====================================================================
// 세션 / 시나리오
// =====================================================================

export async function getSessionByJoinCode(joinCode: string) {
  const { data, error } = await supabase
    .from("game_sessions")
    .select("id,scenario_id,is_active")
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
  is_active: boolean | null;
  scenario_id: string | null;
  scenarios: {
    title: string | null;
    description: string | null;
    difficulty: string | null;
  } | null;
};

export type HostSessionDetailsRow = SessionDetailsRow;

const SESSION_SELECT =
  "id,join_code,host_id,phase,is_active,scenario_id,scenarios(title,description,difficulty)";

export async function getPlaySessionDetails(sessionId: string) {
  const { data, error } = await supabase
    .from("game_sessions")
    .select(SESSION_SELECT)
    .eq("id", sessionId)
    .single();
  if (error) throw error;
  return data as unknown as SessionDetailsRow;
}

export async function getHostSessionDetails(sessionId: string) {
  const { data, error } = await supabase
    .from("game_sessions")
    .select(SESSION_SELECT)
    .eq("id", sessionId)
    .single();
  if (error) throw error;
  return data as unknown as HostSessionDetailsRow;
}

// =====================================================================
// 캐릭터 / 장소 / 단서 (맵)
// =====================================================================

export type CharacterRow = {
  id: string;
  scenario_id: string | null;
  name: string | null;
  role: string | null;
};

export async function getCharacterById(characterId: string) {
  const { data, error } = await supabase
    .from("characters")
    .select("id,scenario_id,name,role")
    .eq("id", characterId)
    .single();
  if (error) throw error;
  return data as CharacterRow;
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
    .select("id,scenario_id,name,role")
    .eq("scenario_id", session.scenario_id)
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as CharacterRow[];
}

export type ScenarioLocationForMap = {
  id: string;
  name: string | null;
  character_id: string | null;
};

export type ScenarioClueForMap = {
  id: string;
  name: string | null;
  content: string | null;
  location_id: string | null;
};

/**
 * 플레이어 맵용 장소·단서 조회.
 * `restrictToCharacterId` 가 지정되면 해당 캐릭터의 방(=character_id 매칭 location)만 반환.
 * (조사 단계: 자기 캐릭터의 방만 / 사건 해결 단계: 모든 방)
 */
export async function getScenarioMapEntities(
  scenarioId: string,
  options?: { restrictToCharacterId?: string | null },
) {
  const [locRes, clueRes] = await Promise.all([
    supabase
      .from("locations")
      .select("id,name,character_id")
      .eq("scenario_id", scenarioId)
      .order("name", { ascending: true }),
    supabase
      .from("clues")
      .select("id,name,content,location_id")
      .eq("scenario_id", scenarioId)
      .order("name", { ascending: true }),
  ]);
  if (locRes.error) throw locRes.error;
  if (clueRes.error) throw clueRes.error;

  const allLocations = (locRes.data ?? []) as ScenarioLocationForMap[];
  const allClues = (clueRes.data ?? []) as ScenarioClueForMap[];

  if (options?.restrictToCharacterId) {
    const filteredLocations = allLocations.filter(
      (loc) => loc.character_id === options.restrictToCharacterId,
    );
    const allowedLocationIds = new Set(filteredLocations.map((loc) => loc.id));
    const filteredClues = allClues.filter((clue) =>
      clue.location_id ? allowedLocationIds.has(clue.location_id) : false,
    );
    return { locations: filteredLocations, clues: filteredClues };
  }

  return { locations: allLocations, clues: allClues };
}

// =====================================================================
// 플레이어
// =====================================================================

export type PlayerSelfRow = {
  id: string;
  nickname: string | null;
  session_id: string | null;
  team_id: string | null;
  character_id: string | null;
  is_solved: boolean | null;
  solved_at: string | null;
  is_online: boolean | null;
};

export type SessionPlayerRow = PlayerSelfRow & {
  characters: { id: string; name: string | null; role: string | null } | null;
  teams: { id: string; name: string | null; is_solved: boolean | null; solved_at: string | null } | null;
};

const PLAYER_SELECT =
  "id,nickname,session_id,team_id,character_id,is_solved,solved_at,is_online";
const PLAYER_SELECT_WITH_REFS =
  `${PLAYER_SELECT},characters(id,name,role),teams(id,name,is_solved,solved_at)`;

/** 본인 플레이어 레코드 조회: 교사가 시작 후 캐릭터·팀이 배정되었는지 확인용 */
export async function getPlayerById(playerId: string) {
  const { data, error } = await supabase
    .from("players")
    .select(PLAYER_SELECT)
    .eq("id", playerId)
    .single();
  if (error) throw error;
  return data as PlayerSelfRow;
}

export async function listSessionPlayers(sessionId: string) {
  const { data, error } = await supabase
    .from("players")
    .select(PLAYER_SELECT_WITH_REFS)
    .eq("session_id", sessionId)
    .order("nickname", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as SessionPlayerRow[];
}

/**
 * 학생이 대기실에 입장. 캐릭터·팀은 교사가 Start 를 누르기 전까지 배정되지 않음.
 */
export async function joinPlayerSession(input: {
  session_id: string;
  nickname: string;
}) {
  const { data: joinedPlayer, error } = await supabase
    .from("players")
    .insert({
      session_id: input.session_id,
      nickname: input.nickname,
      is_online: true,
    })
    .select(PLAYER_SELECT)
    .single();
  if (error) throw error;
  return { player: joinedPlayer as PlayerSelfRow };
}

/** 단일 플레이어 온라인 상태 갱신 (학생이 본인 갱신용) */
export async function setPlayerOnline(playerId: string, online: boolean) {
  const { error } = await supabase
    .from("players")
    .update({ is_online: online })
    .eq("id", playerId);
  if (error) throw error;
}

/** 다중 플레이어 온라인 상태 일괄 갱신 (호스트가 presence 기반 동기화용) */
export async function setPlayersOnline(playerIds: string[], online: boolean) {
  if (playerIds.length === 0) return;
  const { error } = await supabase
    .from("players")
    .update({ is_online: online })
    .in("id", playerIds);
  if (error) throw error;
}

// =====================================================================
// 팀
// =====================================================================

export type TeamRow = {
  id: string;
  session_id: string | null;
  name: string | null;
  found_clue_ids: string[];
  is_solved: boolean | null;
  solved_at: string | null;
};

export async function listSessionTeams(sessionId: string) {
  const { data, error } = await supabase
    .from("teams")
    .select("id,session_id,name,found_clue_ids,is_solved,solved_at")
    .eq("session_id", sessionId)
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as TeamRow[];
}

export async function getTeamById(teamId: string) {
  const { data, error } = await supabase
    .from("teams")
    .select("id,session_id,name,found_clue_ids,is_solved,solved_at")
    .eq("id", teamId)
    .single();
  if (error) throw error;
  return data as TeamRow;
}

/**
 * 팀의 발견 단서 목록에 clueId 추가 (idempotent).
 * 동시성을 줄이기 위해 한 번 fetch 후 비교, 누락이면 update.
 */
export async function addFoundClueToTeam(teamId: string, clueId: string) {
  const { data: team, error: getError } = await supabase
    .from("teams")
    .select("found_clue_ids")
    .eq("id", teamId)
    .single();
  if (getError) throw getError;

  const found = new Set<string>(team?.found_clue_ids ?? []);
  if (found.has(clueId)) return;
  found.add(clueId);

  const { error: updateError } = await supabase
    .from("teams")
    .update({ found_clue_ids: Array.from(found) })
    .eq("id", teamId);
  if (updateError) throw updateError;
}

/** 팀 성공 마킹: idempotent. */
export async function markTeamSolved(teamId: string) {
  const { data: existing, error: getError } = await supabase
    .from("teams")
    .select("is_solved")
    .eq("id", teamId)
    .maybeSingle();
  if (getError) throw getError;
  if (existing?.is_solved) return;

  const { error } = await supabase
    .from("teams")
    .update({ is_solved: true, solved_at: new Date().toISOString() })
    .eq("id", teamId);
  if (error) throw error;
}

/** 플레이어 본인 성공 마킹: idempotent. */
export async function markPlayerSolved(playerId: string) {
  const { data: existing, error: getError } = await supabase
    .from("players")
    .select("is_solved")
    .eq("id", playerId)
    .maybeSingle();
  if (getError) throw getError;
  if (existing?.is_solved) return;

  const { error } = await supabase
    .from("players")
    .update({ is_solved: true, solved_at: new Date().toISOString() })
    .eq("id", playerId);
  if (error) throw error;
}

// =====================================================================
// 팀·캐릭터 무작위 배정
// =====================================================================

function shuffleInPlace<T>(arr: T[]) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function teamLabel(index: number) {
  const A = "A".charCodeAt(0);
  if (index < 26) return String.fromCharCode(A + index);
  const first = Math.floor(index / 26) - 1;
  const second = index % 26;
  return `${String.fromCharCode(A + first)}${String.fromCharCode(A + second)}`;
}

/**
 * 교사 Start 시 호출.
 *  1. 팀 행을 만든다 (numTeams = max(1, floor(playerCount / characterCount))).
 *  2. 모든 대기 플레이어를 무작위로 팀·캐릭터에 배정.
 *
 * 분배 규칙:
 *  - 각 팀이 동일하게 한 명씩 모든 캐릭터를 갖도록 슬롯을 만든 뒤 셔플
 *  - 남는 학생은 팀·캐릭터를 순환 배치(중복 허용)
 *  - 이미 character/team 이 배정된 플레이어는 건너뜀(중복 호출 안전)
 */
export async function assignTeamsAndCharacters(sessionId: string) {
  const { data: session, error: sessionError } = await supabase
    .from("game_sessions")
    .select("scenario_id")
    .eq("id", sessionId)
    .single();
  if (sessionError) throw sessionError;
  if (!session?.scenario_id) {
    throw new Error("This session is not linked to a scenario.");
  }

  const [charactersRes, playersRes, existingTeamsRes] = await Promise.all([
    supabase.from("characters").select("id,name").eq("scenario_id", session.scenario_id),
    supabase.from("players").select("id,character_id,team_id").eq("session_id", sessionId),
    supabase.from("teams").select("id,name").eq("session_id", sessionId),
  ]);
  if (charactersRes.error) throw charactersRes.error;
  if (playersRes.error) throw playersRes.error;
  if (existingTeamsRes.error) throw existingTeamsRes.error;

  const characters = charactersRes.data ?? [];
  const players = playersRes.data ?? [];
  const existingTeams = existingTeamsRes.data ?? [];

  if (characters.length === 0) {
    throw new Error("No characters in this scenario.");
  }
  if (players.length === 0) return;

  const unassigned = players.filter((p) => !p.character_id || !p.team_id);
  if (unassigned.length === 0) return;

  const numTeams = Math.max(1, Math.floor(players.length / characters.length));

  // 1) 부족한 팀 행을 채워 정확히 numTeams 개가 되도록 한다 (이름 A, B, C...)
  const teamRowsByLabel = new Map<string, { id: string; name: string | null }>();
  for (const t of existingTeams) {
    if (t.name) teamRowsByLabel.set(t.name, t);
  }
  const desiredLabels = Array.from({ length: numTeams }, (_, i) => teamLabel(i));
  const labelsToCreate = desiredLabels.filter((label) => !teamRowsByLabel.has(label));
  if (labelsToCreate.length > 0) {
    const { data: created, error: createError } = await supabase
      .from("teams")
      .insert(labelsToCreate.map((name) => ({ session_id: sessionId, name })))
      .select("id,name");
    if (createError) throw createError;
    for (const t of created ?? []) {
      if (t.name) teamRowsByLabel.set(t.name, t);
    }
  }

  // 2) 슬롯 생성: 각 팀 × 각 캐릭터 1조합 + 남는 학생용 보충 슬롯
  const slots: Array<{ teamId: string; characterId: string }> = [];
  for (const label of desiredLabels) {
    const teamRow = teamRowsByLabel.get(label);
    if (!teamRow) continue;
    for (const ch of characters) {
      slots.push({ teamId: teamRow.id, characterId: ch.id });
    }
  }
  const extras = players.length - slots.length;
  if (extras > 0) {
    const shuffledChars = [...characters];
    shuffleInPlace(shuffledChars);
    for (let i = 0; i < extras; i++) {
      const teamRow = teamRowsByLabel.get(desiredLabels[i % desiredLabels.length]);
      if (!teamRow) continue;
      slots.push({
        teamId: teamRow.id,
        characterId: shuffledChars[i % shuffledChars.length].id,
      });
    }
  }

  shuffleInPlace(slots);
  const shuffledPlayers = [...players];
  shuffleInPlace(shuffledPlayers);

  // 3) 플레이어에 슬롯 매핑 (이미 배정된 플레이어는 건너뛴다)
  await Promise.all(
    shuffledPlayers.map((player, i) => {
      if (player.character_id && player.team_id) return Promise.resolve();
      const slot = slots[i];
      if (!slot) return Promise.resolve();
      return supabase
        .from("players")
        .update({ character_id: slot.characterId, team_id: slot.teamId })
        .eq("id", player.id)
        .then(({ error }) => {
          if (error) throw error;
        });
    }),
  );
}
