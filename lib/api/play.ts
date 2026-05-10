"use client";

import type { SuspectEntry } from "@/lib/suspects";
import { supabase } from "@/lib/supabase";

// =====================================================================
// 세션 / 사건
// =====================================================================

export async function getSessionByJoinCode(joinCode: string) {
  const { data, error } = await supabase
    .from("game_sessions")
    .select("id,case_id,is_active,phase")
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
  case_id: string | null;
  cases: {
    title: string | null;
    description: string | null;
    suspect_roster: SuspectEntry[] | null;
    difficulty: string | null;
    answer_suspect_id: string | null;
  } | null;
};

export type HostSessionDetailsRow = SessionDetailsRow;

const SESSION_SELECT =
  "id,join_code,host_id,phase,is_active,case_id,cases(title,description,suspect_roster,difficulty,answer_suspect_id)";

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
// 장소 / 단서 (맵)
// =====================================================================

export type CaseLocationForMap = {
  id: string;
  name: string | null;
};

export type ClueMapProps = {
  x: number;
  y: number;
  asset?: string;
  /** 맵 에디터 좌표계 기준 표시 크기(px), 격자에 맞춰 저장 */
  w?: number;
  h?: number;
  /** 레거시: 격자 칸 수만 있던 경우 */
  tile_w?: number;
  tile_h?: number;
};

export type CaseClueForMap = {
  id: string;
  name: string | null;
  content: string | null;
  location_id: string | null;
  props: ClueMapProps | null;
};

/**
 * `restrictToInvestigationLocationId`: 본인 조사 장소 맵만.
 */
export async function getCaseMapEntities(
  caseId: string,
  options?: {
    restrictToInvestigationLocationId?: string | null;
  },
) {
  const [locRes, clueRes] = await Promise.all([
    supabase
      .from("locations")
      .select("id,name")
      .eq("case_id", caseId)
      .order("name", { ascending: true }),
    supabase
      .from("clues")
      .select("id,name,content,location_id,props")
      .eq("case_id", caseId)
      .order("name", { ascending: true }),
  ]);
  if (locRes.error) throw locRes.error;
  if (clueRes.error) throw clueRes.error;

  const allLocations = (locRes.data ?? []) as CaseLocationForMap[];
  const allClues = (clueRes.data ?? []) as CaseClueForMap[];

  if (options?.restrictToInvestigationLocationId) {
    const filteredLocations = allLocations.filter(
      (loc) => loc.id === options.restrictToInvestigationLocationId,
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
  investigation_location_id: string | null;
  is_online: boolean | null;
  created_at: string;
};

const PLAYER_SELECT =
  "id,nickname,session_id,team_id,investigation_location_id,is_online,created_at";

const PLAYER_SELECT_WITH_TEAM_INVESTIGATION = `${PLAYER_SELECT},teams(id,name,found_clue_ids),investigation_zone:locations!investigation_location_id(name)`;

export type SessionPlayerRow = PlayerSelfRow & {
  investigation_zone: { name: string | null } | null;
  teams: {
    id: string;
    name: string | null;
    found_clue_ids: string[] | null;
  } | null;
};

export async function getPlayerById(playerId: string) {
  const { data, error } = await supabase
    .from("players")
    .select(PLAYER_SELECT)
    .eq("id", playerId)
    .single();
  if (error) throw error;
  return data as PlayerSelfRow;
}

export type PlayerWithInvestigationRow = PlayerSelfRow & {
  investigation_zone: { name: string | null } | null;
};

export async function getPlayerWithInvestigationZone(playerId: string) {
  const { data, error } = await supabase
    .from("players")
    .select(`${PLAYER_SELECT},investigation_zone:locations!investigation_location_id(name)`)
    .eq("id", playerId)
    .single();
  if (error) throw error;
  return data as unknown as PlayerWithInvestigationRow;
}

export async function listSessionPlayers(sessionId: string) {
  const { data, error } = await supabase
    .from("players")
    .select(PLAYER_SELECT_WITH_TEAM_INVESTIGATION)
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false })
    .order("nickname", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as SessionPlayerRow[];
}

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

/**
 * 수사가 이미 시작된 뒤(`phase` ≠ waiting) 입장한 플레이어에게만 팀·조사 장소를 붙입니다.
 * 기존 플레이어의 배정은 변경하지 않습니다.
 */
export async function assignOrphanPlayersForOngoingSession(sessionId: string) {
  const { data: sess, error: se } = await supabase
    .from("game_sessions")
    .select("phase,case_id")
    .eq("id", sessionId)
    .single();
  if (se) throw se;
  const phase = sess?.phase ?? "waiting";
  if (phase === "waiting" || phase === "session_end") return;

  const caseId = sess?.case_id;
  if (!caseId) return;

  const { data: locRows, error: le } = await supabase.from("locations").select("id").eq("case_id", caseId);
  if (le) throw le;
  const investigationIds = (locRows ?? []).map((r) => r.id as string);
  if (investigationIds.length === 0) return;

  const { data: teamRows, error: te } = await supabase
    .from("teams")
    .select("id,name")
    .eq("session_id", sessionId);
  if (te) throw te;
  const teams = teamRows ?? [];
  if (teams.length === 0) return;

  const { data: playerRows, error: pe } = await supabase
    .from("players")
    .select("id,team_id,investigation_location_id")
    .eq("session_id", sessionId);
  if (pe) throw pe;
  const rows = playerRows ?? [];

  const orphans = rows.filter((p) => !p.team_id || !p.investigation_location_id);
  if (orphans.length === 0) return;

  type P = (typeof rows)[number];
  const state: P[] = rows.map((r) => ({ ...r }));

  const pickZone = (teamId: string): string => {
    const members = state.filter((p) => p.team_id === teamId);
    let best = investigationIds[0]!;
    let bestCount = Infinity;
    for (const lid of investigationIds) {
      const c = members.filter((p) => p.investigation_location_id === lid).length;
      if (c < bestCount) {
        bestCount = c;
        best = lid;
      }
    }
    return best;
  };

  const teamIds = teams.map((t) => t.id as string);

  for (const orphan of orphans) {
    let bestTeam = teamIds[0]!;
    let bestSize = Infinity;
    for (const tid of teamIds) {
      const sz = state.filter((p) => p.team_id === tid).length;
      if (sz < bestSize) {
        bestSize = sz;
        bestTeam = tid;
      }
    }

    const zone = pickZone(bestTeam);

    const { error: up } = await supabase
      .from("players")
      .update({ team_id: bestTeam, investigation_location_id: zone })
      .eq("id", orphan.id);
    if (up) throw up;

    const st = state.find((p) => p.id === orphan.id);
    if (st) {
      st.team_id = bestTeam;
      st.investigation_location_id = zone;
    }
  }
}

export async function setPlayerOnline(playerId: string, online: boolean) {
  const { error } = await supabase
    .from("players")
    .update({ is_online: online })
    .eq("id", playerId);
  if (error) throw error;
}

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
};

export type PlayerReportInput = {
  suspectId: string;
  method: string;
  motive: string;
  decisiveClue: string;
};

export type PlayerReportRow = {
  id: string;
  session_id: string;
  team_id: string | null;
  player_id: string;
  suspect_id: string;
  method: string;
  motive: string;
  decisive_clue: string;
  submitted_at: string;
};

const PLAYER_REPORT_SELECT =
  "id,session_id,team_id,player_id,suspect_id,method,motive,decisive_clue,submitted_at";

export async function listSessionTeams(sessionId: string) {
  const { data, error } = await supabase
    .from("teams")
    .select("id,session_id,name,found_clue_ids")
    .eq("session_id", sessionId)
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as TeamRow[];
}

export async function getTeamById(teamId: string) {
  const { data, error } = await supabase
    .from("teams")
    .select("id,session_id,name,found_clue_ids")
    .eq("id", teamId)
    .single();
  if (error) throw error;
  return data as TeamRow;
}

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

// =====================================================================
// 범인 지목서(부원별 1회)
// =====================================================================

/** 본인 보고서 1건. 미제출이면 null. */
export async function getPlayerReport(playerId: string) {
  const { data, error } = await supabase
    .from("player_reports")
    .select(PLAYER_REPORT_SELECT)
    .eq("player_id", playerId)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as PlayerReportRow | null;
}

/** 같은 팀 부원 전원의 보고서. 다수결 판정·진행 모니터링용. */
export async function listTeamReports(teamId: string) {
  const { data, error } = await supabase
    .from("player_reports")
    .select(PLAYER_REPORT_SELECT)
    .eq("team_id", teamId)
    .order("submitted_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as PlayerReportRow[];
}

/** 호스트(선생님) 화면용. 세션의 모든 부원 보고서. */
export async function listSessionPlayerReports(sessionId: string) {
  const { data, error } = await supabase
    .from("player_reports")
    .select(PLAYER_REPORT_SELECT)
    .eq("session_id", sessionId)
    .order("submitted_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as PlayerReportRow[];
}

/**
 * 부원의 범인 지목서(1회). 이미 제출됐으면 에러.
 */
export async function submitPlayerReport(
  args: { playerId: string; sessionId: string; teamId: string | null },
  report: PlayerReportInput,
) {
  const { data: existing, error: getError } = await supabase
    .from("player_reports")
    .select("id")
    .eq("player_id", args.playerId)
    .maybeSingle();
  if (getError) throw getError;
  if (existing?.id) {
    throw new Error("이미 제출한 보고서가 있습니다.");
  }

  const { error } = await supabase.from("player_reports").insert({
    player_id: args.playerId,
    session_id: args.sessionId,
    team_id: args.teamId,
    suspect_id: report.suspectId.trim(),
    method: report.method.trim(),
    motive: report.motive.trim(),
    decisive_clue: report.decisiveClue.trim(),
  });
  if (error) throw error;
}

// =====================================================================
// 팀·조사 장소(랜덤)
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
 * 세션 시작 시: 팀 편성 + 팀원마다 조사 장소(사건 장소) 랜덤.
 * 팀 인원이 장소 수로 나누어떨어지지 않으면 한 팀 안에서 같은 장소를 여러 명에게 배정할 수 있습니다.
 */
export async function assignTeamsAndInvestigation(sessionId: string) {
  const { data: session, error: sessionError } = await supabase
    .from("game_sessions")
    .select("case_id")
    .eq("id", sessionId)
    .single();
  if (sessionError) throw sessionError;
  if (!session?.case_id) {
    throw new Error("이 수사 세션이 사건 원본과 연결되어 있지 않습니다.");
  }
  const caseId = session.case_id;

  const { data: locRows, error: locErr } = await supabase
    .from("locations")
    .select("id")
    .eq("case_id", caseId);
  if (locErr) throw locErr;
  const investigationIds = (locRows ?? []).map((r) => r.id as string);
  if (investigationIds.length === 0) {
    throw new Error("이 사건에 조사 장소이 없습니다. 맵 단계에서 장소을 추가해 주세요.");
  }

  const { data: allPlayers, error: pErr } = await supabase
    .from("players")
    .select("id,team_id,investigation_location_id")
    .eq("session_id", sessionId);
  if (pErr) throw pErr;
  const players = allPlayers ?? [];
  if (players.length === 0) return;

  const needsAssign = players.filter((p) => !p.team_id || !p.investigation_location_id);
  if (needsAssign.length === 0) return;

  const { data: existingTeams, error: tErr } = await supabase
    .from("teams")
    .select("id,name")
    .eq("session_id", sessionId);
  if (tErr) throw tErr;

  const zoneCount = investigationIds.length;
  const numTeams = Math.max(1, Math.floor(players.length / zoneCount));

  const teamRowsByLabel = new Map<string, { id: string; name: string | null }>();
  for (const t of existingTeams ?? []) {
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

  const teamIds = desiredLabels
    .map((label) => teamRowsByLabel.get(label)?.id)
    .filter((v): v is string => Boolean(v));
  if (teamIds.length === 0) return;

  const shuffled = [...players].sort(() => Math.random() - 0.5);
  const byTeam: string[][] = teamIds.map(() => []);
  shuffled.forEach((p, i) => {
    byTeam[i % teamIds.length]!.push(p.id);
  });

  for (let ti = 0; ti < byTeam.length; ti++) {
    const memberIds = byTeam[ti]!;
    const teamId = teamIds[ti]!;
    if (memberIds.length === 0) continue;
    shuffleInPlace(memberIds);
    const shuffledZones = [...investigationIds];
    shuffleInPlace(shuffledZones);
    const zoneSlotCount = shuffledZones.length;
    for (let j = 0; j < memberIds.length; j++) {
      const playerId = memberIds[j]!;
      const investigationId = shuffledZones[j % zoneSlotCount]!;
      const { error: upErr } = await supabase
        .from("players")
        .update({ team_id: teamId, investigation_location_id: investigationId })
        .eq("id", playerId);
      if (upErr) throw upErr;
    }
  }
}

export const assignTeamsAndClubSlots = assignTeamsAndInvestigation;
export const assignTeamsAndCharacters = assignTeamsAndInvestigation;
