"use client";

import { parseActivityPack } from "@/lib/api/activities";
import {
  PLAYER_MESSAGES,
  assignRolesToPlayers,
  computeSessionGroupCount,
  computeBaseScoreFromPracticeResults,
  getPracticeQuestions,
  getTestQuestions,
  groupLabel,
  isPracticeCompleteForRole,
  isQuizComplete,
} from "@/lib/activity-pack/engine";
import { MIN_ROLES_PER_GROUP } from "@/lib/activity-pack/sizing";
import type { ActivityPack, PracticeQuestionResult, QuizAnswer } from "@/lib/activity-pack/types";
import { supabase } from "@/lib/supabase";

// =====================================================================
// sessions / activities
// =====================================================================

export async function getSessionByJoinCode(joinCode: string) {
  const { data, error } = await supabase
    .from("sessions")
    .select("id,activity_id,status,phase")
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
  status: string | null;
  created_at: string | null;
  activity_id: string | null;
  activities: {
    title: string | null;
    description: string | null;
    activity_pack: ActivityPack | null;
  } | null;
};

export type HostSessionDetailsRow = SessionDetailsRow;

const SESSION_SELECT =
  "id,join_code,host_id,phase,status,created_at,activity_id,activities(title,description,activity_pack)";

export async function getPlaySessionDetails(sessionId: string) {
  const { data, error } = await supabase
    .from("sessions")
    .select(SESSION_SELECT)
    .eq("id", sessionId)
    .single();
  if (error) throw error;
  const row = data as unknown as SessionDetailsRow;
  if (row.activities?.activity_pack) {
    row.activities.activity_pack = parseActivityPack(row.activities.activity_pack);
  }
  return row;
}

export async function getHostSessionDetails(sessionId: string) {
  return getPlaySessionDetails(sessionId);
}

// =====================================================================
// players
// =====================================================================

export type PlayerSelfRow = {
  id: string;
  nickname: string | null;
  session_id: string | null;
  group_id: string | null;
  assigned_role_id: string | null;
  base_score: number | null;
  practice_results: PracticeQuestionResult[];
  practice_submitted_at: string | null;
  individual_quiz_answers: QuizAnswer[];
  individual_quiz_submitted_at: string | null;
  is_online: boolean | null;
  created_at: string;
};

const PLAYER_SELECT =
  "id,nickname,session_id,group_id,assigned_role_id,base_score,practice_results,practice_submitted_at,individual_quiz_answers,individual_quiz_submitted_at,is_online,created_at";

/** 배정 역할 → 단일 역할 id 배열 (역할 라벨 표시 공통 헬퍼) */
export function parseAssignedRoleIds(player: {
  assigned_role_id?: string | null;
}): string[] {
  return player.assigned_role_id ? [player.assigned_role_id] : [];
}

const PLAYER_SELECT_WITH_GROUP = `${PLAYER_SELECT},groups(id,name)`;

export type SessionPlayerRow = PlayerSelfRow & {
  groups: {
    id: string;
    name: string | null;
  } | null;
};

export async function getPlayerById(playerId: string) {
  const { data, error } = await supabase
    .from("players")
    .select(PLAYER_SELECT)
    .eq("id", playerId)
    .single();
  if (error) throw error;
  return normalizePlayerRow(data as PlayerSelfRow);
}

export async function listSessionPlayers(sessionId: string) {
  const { data, error } = await supabase
    .from("players")
    .select(PLAYER_SELECT_WITH_GROUP)
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false })
    .order("nickname", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => normalizePlayerRow(row as PlayerSelfRow)) as SessionPlayerRow[];
}

export async function joinPlayerSession(input: { session_id: string; nickname: string }) {
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

export async function assignOrphanPlayersForOngoingSession(sessionId: string) {
  const { data: sess, error: se } = await supabase
    .from("sessions")
    .select("phase,activity_id")
    .eq("id", sessionId)
    .single();
  if (se) throw se;
  const phase = sess?.phase ?? "waiting";
  if (phase === "waiting" || phase === "results" || !sess?.activity_id) return;

  const { data: activity, error: le } = await supabase
    .from("activities")
    .select("activity_pack")
    .eq("id", sess.activity_id)
    .single();
  if (le) throw le;
  const pack = parseActivityPack(activity?.activity_pack);
  if (!pack) return;

  const { data: playerRows, error: pe } = await supabase
    .from("players")
    .select("id,group_id,assigned_role_id")
    .eq("session_id", sessionId);
  if (pe) throw pe;
  const orphans = (playerRows ?? []).filter((p) => !p.group_id || !p.assigned_role_id);
  if (orphans.length === 0) return;

  await assignGroupsAndRoles(sessionId, pack);
}

export async function setPlayerOnline(playerId: string, online: boolean) {
  const { error } = await supabase.from("players").update({ is_online: online }).eq("id", playerId);
  if (error) throw error;
}

export async function setPlayersOnline(playerIds: string[], online: boolean) {
  if (playerIds.length === 0) return;
  const { error } = await supabase.from("players").update({ is_online: online }).in("id", playerIds);
  if (error) throw error;
}

// =====================================================================
// groups
// =====================================================================

export type GroupRow = {
  id: string;
  session_id: string | null;
  name: string | null;
};

const GROUP_SELECT = "id,session_id,name";

export function parseQuizAnswers(raw: unknown): QuizAnswer[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row) => {
      const r = row as Record<string, unknown>;
      const questionId = String(r.questionId ?? "");
      const choiceIndex =
        typeof r.choiceIndex === "number" ? Math.floor(r.choiceIndex) : -1;
      return { questionId, choiceIndex };
    })
    .filter((a) => a.questionId.length > 0 && a.choiceIndex >= 0);
}

export function parsePracticeResults(raw: unknown): PracticeQuestionResult[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row) => {
      const r = row as Record<string, unknown>;
      const questionId = String(r.questionId ?? "").trim();
      const wrongAttempts =
        typeof r.wrongAttempts === "number" ? Math.max(0, Math.floor(r.wrongAttempts)) : 0;
      return { questionId, wrongAttempts };
    })
    .filter((r) => r.questionId.length > 0);
}

function normalizePlayerRow(row: PlayerSelfRow & { practice_results?: unknown }): PlayerSelfRow {
  return {
    ...row,
    practice_results: parsePracticeResults(row.practice_results),
    individual_quiz_answers: parseQuizAnswers(row.individual_quiz_answers),
  };
}

export async function listSessionGroups(sessionId: string) {
  const { data, error } = await supabase
    .from("groups")
    .select(GROUP_SELECT)
    .eq("session_id", sessionId)
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as GroupRow[];
}

export async function getGroupById(groupId: string) {
  const { data, error } = await supabase.from("groups").select(GROUP_SELECT).eq("id", groupId).single();
  if (error) throw error;
  return data as GroupRow;
}

export async function listGroupMembers(groupId: string): Promise<PlayerSelfRow[]> {
  const { data, error } = await supabase
    .from("players")
    .select(PLAYER_SELECT)
    .eq("group_id", groupId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => normalizePlayerRow(row as PlayerSelfRow));
}

// =====================================================================
// group assignment
// =====================================================================

export async function assignGroupsAndRoles(sessionId: string, pack: ActivityPack) {
  if (pack.roles.length === 0) {
    throw new Error("활동에 역할이 없습니다.");
  }

  const { data: allPlayers, error: pErr } = await supabase
    .from("players")
    .select("id,group_id,assigned_role_id")
    .eq("session_id", sessionId);
  if (pErr) throw pErr;
  const players = allPlayers ?? [];
  if (players.length === 0) return;

  const needsAssign = players.filter((p) => !p.group_id || !p.assigned_role_id);
  if (needsAssign.length === 0) return;

  const { data: existingGroups, error: tErr } = await supabase
    .from("groups")
    .select("id,name")
    .eq("session_id", sessionId);
  if (tErr) throw tErr;

  const roleCount = Math.max(MIN_ROLES_PER_GROUP, pack.roles.length);
  const shuffled = [...players].sort(() => Math.random() - 0.5);
  const numGroups = computeSessionGroupCount(shuffled.length, roleCount);

  const groupRowsByLabel = new Map<string, { id: string; name: string | null }>();
  for (const t of existingGroups ?? []) {
    if (t.name) groupRowsByLabel.set(t.name, t);
  }
  const desiredLabels = Array.from({ length: numGroups }, (_, i) => groupLabel(i));
  const labelsToCreate = desiredLabels.filter((label) => !groupRowsByLabel.has(label));
  if (labelsToCreate.length > 0) {
    const { data: created, error: createError } = await supabase
      .from("groups")
      .insert(labelsToCreate.map((name) => ({ session_id: sessionId, name })))
      .select("id,name");
    if (createError) throw createError;
    for (const t of created ?? []) {
      if (t.name) groupRowsByLabel.set(t.name, t);
    }
  }

  const groupIds = desiredLabels
    .map((label) => groupRowsByLabel.get(label)?.id)
    .filter((v): v is string => Boolean(v));
  if (groupIds.length === 0) return;

  for (let gi = 0; gi < groupIds.length; gi++) {
    const groupId = groupIds[gi]!;
    const memberIds = shuffled
      .filter((_, idx) => idx % numGroups === gi)
      .map((p) => p.id);
    const roleAssignment = assignRolesToPlayers(pack, memberIds);
    for (const playerId of memberIds) {
      const assigned = roleAssignment.get(playerId);
      const { error: upErr } = await supabase
        .from("players")
        .update({
          group_id: groupId,
          assigned_role_id: assigned?.roleId ?? null,
        })
        .eq("id", playerId);
      if (upErr) throw upErr;
    }
  }
}

// =====================================================================
// gameplay — practice (expert) + formative test
// =====================================================================

/** 전문가 연습 결과 제출 (역할 연습 문항 전부 완료 시, 기준 점수 = 문항 점수 평균) */
export async function submitPracticeResult(args: {
  playerId: string;
  pack: ActivityPack;
  roleId: string;
  results: PracticeQuestionResult[];
}) {
  const player = await getPlayerById(args.playerId);
  if (player.practice_submitted_at) {
    throw new Error(PLAYER_MESSAGES.practiceAlreadyDone);
  }

  const questions = getPracticeQuestions(args.pack, args.roleId);
  if (!isPracticeCompleteForRole(questions, args.results)) {
    throw new Error(PLAYER_MESSAGES.practiceIncomplete);
  }

  const baseScore = computeBaseScoreFromPracticeResults(args.results);

  const { error } = await supabase
    .from("players")
    .update({
      base_score: baseScore,
      practice_results: args.results,
      practice_submitted_at: new Date().toISOString(),
    })
    .eq("id", args.playerId);
  if (error) throw error;
}

/** 개별 형성평가 제출 (실전 문제, 개인 1회) */
export async function submitIndividualQuiz(args: {
  playerId: string;
  pack: ActivityPack;
  answers: QuizAnswer[];
}) {
  const player = await getPlayerById(args.playerId);
  if (player.individual_quiz_submitted_at) {
    throw new Error(PLAYER_MESSAGES.individualQuizAlreadySubmitted);
  }
  if (!isQuizComplete(getTestQuestions(args.pack), args.answers)) {
    throw new Error(PLAYER_MESSAGES.quizIncomplete);
  }

  const { error } = await supabase
    .from("players")
    .update({
      individual_quiz_answers: args.answers,
      individual_quiz_submitted_at: new Date().toISOString(),
    })
    .eq("id", args.playerId);
  if (error) throw error;
}
