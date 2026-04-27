"use client";

import type { ClubRole } from "@/lib/club-role";
import type { SuspectEntry } from "@/lib/suspects";
import { supabase } from "@/lib/supabase";

// =====================================================================
// 세션 / 사건
// =====================================================================

export async function getSessionByJoinCode(joinCode: string) {
  const { data, error } = await supabase
    .from("game_sessions")
    .select("id,case_id,is_active")
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
  w?: number;
  h?: number;
};

export type CaseClueForMap = {
  id: string;
  name: string | null;
  content: string | null;
  location_id: string | null;
  props: ClueMapProps | null;
};

/**
 * `restrictToPatrolLocationId`: 본인 조사 구역 맵만.
 */
export async function getCaseMapEntities(
  caseId: string,
  options?: {
    restrictToPatrolLocationId?: string | null;
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

  if (options?.restrictToPatrolLocationId) {
    const filteredLocations = allLocations.filter(
      (loc) => loc.id === options.restrictToPatrolLocationId,
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
  club_role: string | null;
  patrol_location_id: string | null;
  is_online: boolean | null;
};

const PLAYER_SELECT =
  "id,nickname,session_id,team_id,club_role,patrol_location_id,is_online";

const PLAYER_SELECT_WITH_TEAM_PATROL = `${PLAYER_SELECT},teams(id,name,found_clue_ids,report_suspect_id,report_method,report_motive,report_decisive_clue,report_submitted_at),patrol_zone:locations!patrol_location_id(name)`;

export type SessionPlayerRow = PlayerSelfRow & {
  patrol_zone: { name: string | null } | null;
  teams: {
    id: string;
    name: string | null;
    found_clue_ids: string[] | null;
    report_suspect_id: string | null;
    report_method: string | null;
    report_motive: string | null;
    report_decisive_clue: string | null;
    report_submitted_at: string | null;
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

export type PlayerWithPatrolRow = PlayerSelfRow & {
  patrol_zone: { name: string | null } | null;
};

export async function getPlayerWithPatrolZone(playerId: string) {
  const { data, error } = await supabase
    .from("players")
    .select(`${PLAYER_SELECT},patrol_zone:locations!patrol_location_id(name)`)
    .eq("id", playerId)
    .single();
  if (error) throw error;
  return data as unknown as PlayerWithPatrolRow;
}

export async function listSessionPlayers(sessionId: string) {
  const { data, error } = await supabase
    .from("players")
    .select(PLAYER_SELECT_WITH_TEAM_PATROL)
    .eq("session_id", sessionId)
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
  report_suspect_id: string | null;
  report_method: string | null;
  report_motive: string | null;
  report_decisive_clue: string | null;
  report_submitted_at: string | null;
};

export type TeamReportInput = {
  suspectId: string;
  method: string;
  motive: string;
  decisiveClue: string;
};

export async function listSessionTeams(sessionId: string) {
  const { data, error } = await supabase
    .from("teams")
    .select(
      "id,session_id,name,found_clue_ids,report_suspect_id,report_method,report_motive,report_decisive_clue,report_submitted_at",
    )
    .eq("session_id", sessionId)
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as TeamRow[];
}

export async function getTeamById(teamId: string) {
  const { data, error } = await supabase
    .from("teams")
    .select(
      "id,session_id,name,found_clue_ids,report_suspect_id,report_method,report_motive,report_decisive_clue,report_submitted_at",
    )
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

/**
 * 팀의 최종 보고서(1회). 이미 제출됐으면 에러.
 */
export async function submitTeamReport(teamId: string, report: TeamReportInput) {
  const { data: existing, error: getError } = await supabase
    .from("teams")
    .select("report_submitted_at")
    .eq("id", teamId)
    .single();
  if (getError) throw getError;
  if (existing?.report_submitted_at) {
    throw new Error("이미 제출한 보고서가 있습니다.");
  }

  const { error } = await supabase
    .from("teams")
    .update({
      report_suspect_id: report.suspectId.trim(),
      report_method: report.method.trim(),
      report_motive: report.motive.trim(),
      report_decisive_clue: report.decisiveClue.trim(),
      report_submitted_at: new Date().toISOString(),
    })
    .eq("id", teamId);
  if (error) throw error;
}

// =====================================================================
// 팀·역할(부장/차장/부원)·조사 구역(랜덤)
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

function roleForMemberIndex(i: number): ClubRole {
  if (i === 0) return "president";
  if (i === 1) return "vice_president";
  return "member";
}

/**
 * 세션 시작 시: 팀 편성 + 팀마다 부장1·차장1·나머지 부원 + 조사 구역(사건 장소) 랜덤.
 */
export async function assignTeamsAndPatrol(sessionId: string) {
  const { data: session, error: sessionError } = await supabase
    .from("game_sessions")
    .select("case_id")
    .eq("id", sessionId)
    .single();
  if (sessionError) throw sessionError;
  if (!session?.case_id) {
    throw new Error("이 세션이 사건과 연결되어 있지 않습니다.");
  }
  const caseId = session.case_id;

  const { data: locRows, error: locErr } = await supabase
    .from("locations")
    .select("id")
    .eq("case_id", caseId);
  if (locErr) throw locErr;
  const investigationIds = (locRows ?? []).map((r) => r.id as string);
  if (investigationIds.length === 0) {
    throw new Error("이 사건에 조사 구역이 없습니다. 맵 단계에서 구역을 추가해 주세요.");
  }

  const { data: allPlayers, error: pErr } = await supabase
    .from("players")
    .select("id,team_id,club_role,patrol_location_id")
    .eq("session_id", sessionId);
  if (pErr) throw pErr;
  const players = allPlayers ?? [];
  if (players.length === 0) return;

  const needsAssign = players.filter(
    (p) => !p.team_id || !p.club_role || !p.patrol_location_id,
  );
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
    for (let j = 0; j < memberIds.length; j++) {
      const playerId = memberIds[j]!;
      const role = roleForMemberIndex(j);
      const patrolId = shuffledZones[j % shuffledZones.length]!;
      const { error: upErr } = await supabase
        .from("players")
        .update({ team_id: teamId, club_role: role, patrol_location_id: patrolId })
        .eq("id", playerId);
      if (upErr) throw upErr;
    }
  }
}

export const assignTeamsAndClubSlots = assignTeamsAndPatrol;
export const assignTeamsAndCharacters = assignTeamsAndPatrol;
