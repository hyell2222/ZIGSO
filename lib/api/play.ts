"use client";

import { parseScenarioPack } from "@/lib/api/lessons";
import { tryAcquireIngredient, tryCompleteMenu } from "@/lib/lunch/engine";
import type { AcquiredIngredient, CompletedMenu, ScenarioPack } from "@/lib/lunch/types";
import { supabase } from "@/lib/supabase";

// =====================================================================
// sessions / lessons
// =====================================================================

export async function getSessionByJoinCode(joinCode: string) {
  const { data, error } = await supabase
    .from("sessions")
    .select("id,lesson_id,is_active,phase")
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
  created_at: string | null;
  lesson_id: string | null;
  lessons: {
    title: string | null;
    description: string | null;
    difficulty: string | null;
    scenario_pack: ScenarioPack | null;
  } | null;
};

export type HostSessionDetailsRow = SessionDetailsRow;

const SESSION_SELECT =
  "id,join_code,host_id,phase,is_active,created_at,lesson_id,lessons(title,description,difficulty,scenario_pack)";

export async function getPlaySessionDetails(sessionId: string) {
  const { data, error } = await supabase
    .from("sessions")
    .select(SESSION_SELECT)
    .eq("id", sessionId)
    .single();
  if (error) throw error;
  const row = data as unknown as SessionDetailsRow;
  if (row.lessons?.scenario_pack) {
    row.lessons.scenario_pack = parseScenarioPack(row.lessons.scenario_pack);
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
  team_id: string | null;
  assigned_ingredient_id: string | null;
  is_online: boolean | null;
  created_at: string;
};

const PLAYER_SELECT =
  "id,nickname,session_id,team_id,assigned_ingredient_id,is_online,created_at";

const PLAYER_SELECT_WITH_TEAM = `${PLAYER_SELECT},teams(id,name,acquired_ingredients,completed_menus,tray_submitted_at)`;

export type SessionPlayerRow = PlayerSelfRow & {
  teams: {
    id: string;
    name: string | null;
    acquired_ingredients: AcquiredIngredient[] | null;
    completed_menus: CompletedMenu[] | null;
    tray_submitted_at: string | null;
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

export async function listSessionPlayers(sessionId: string) {
  const { data, error } = await supabase
    .from("players")
    .select(PLAYER_SELECT_WITH_TEAM)
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false })
    .order("nickname", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as SessionPlayerRow[];
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
    .select("phase,lesson_id")
    .eq("id", sessionId)
    .single();
  if (se) throw se;
  const phase = sess?.phase ?? "waiting";
  if (phase === "waiting" || phase === "session_end" || !sess?.lesson_id) return;

  const { data: lesson, error: le } = await supabase
    .from("lessons")
    .select("scenario_pack")
    .eq("id", sess.lesson_id)
    .single();
  if (le) throw le;
  const pack = parseScenarioPack(lesson?.scenario_pack);
  if (!pack) return;

  const { data: playerRows, error: pe } = await supabase
    .from("players")
    .select("id,team_id,assigned_ingredient_id")
    .eq("session_id", sessionId);
  if (pe) throw pe;
  const orphans = (playerRows ?? []).filter((p) => !p.team_id || !p.assigned_ingredient_id);
  if (orphans.length === 0) return;

  await assignTeamsAndIngredients(sessionId, pack);
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
// teams
// =====================================================================

export type TeamRow = {
  id: string;
  session_id: string | null;
  name: string | null;
  acquired_ingredients: AcquiredIngredient[];
  completed_menus: CompletedMenu[];
  tray_submitted_at: string | null;
};

const TEAM_SELECT =
  "id,session_id,name,acquired_ingredients,completed_menus,tray_submitted_at";

function parseAcquired(raw: unknown): AcquiredIngredient[] {
  return Array.isArray(raw) ? (raw as AcquiredIngredient[]) : [];
}

function parseCompleted(raw: unknown): CompletedMenu[] {
  return Array.isArray(raw) ? (raw as CompletedMenu[]) : [];
}

export async function listSessionTeams(sessionId: string) {
  const { data, error } = await supabase
    .from("teams")
    .select(TEAM_SELECT)
    .eq("session_id", sessionId)
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    ...row,
    acquired_ingredients: parseAcquired(row.acquired_ingredients),
    completed_menus: parseCompleted(row.completed_menus),
  })) as TeamRow[];
}

export async function getTeamById(teamId: string) {
  const { data, error } = await supabase.from("teams").select(TEAM_SELECT).eq("id", teamId).single();
  if (error) throw error;
  return {
    ...data,
    acquired_ingredients: parseAcquired(data.acquired_ingredients),
    completed_menus: parseCompleted(data.completed_menus),
  } as TeamRow;
}

// =====================================================================
// team assignment
// =====================================================================

function teamLabel(index: number) {
  const A = "A".charCodeAt(0);
  if (index < 26) return String.fromCharCode(A + index);
  const first = Math.floor(index / 26) - 1;
  const second = index % 26;
  return `${String.fromCharCode(A + first)}${String.fromCharCode(A + second)}`;
}

export async function assignTeamsAndIngredients(sessionId: string, pack: ScenarioPack) {
  const ingredients = pack.ingredients;
  if (ingredients.length === 0) {
    throw new Error("급식 시나리오에 재료가 없습니다.");
  }

  const { data: allPlayers, error: pErr } = await supabase
    .from("players")
    .select("id,team_id,assigned_ingredient_id")
    .eq("session_id", sessionId);
  if (pErr) throw pErr;
  const players = allPlayers ?? [];
  if (players.length === 0) return;

  const needsAssign = players.filter((p) => !p.team_id || !p.assigned_ingredient_id);
  if (needsAssign.length === 0) return;

  const { data: existingTeams, error: tErr } = await supabase
    .from("teams")
    .select("id,name")
    .eq("session_id", sessionId);
  if (tErr) throw tErr;

  const teamSize = Math.max(2, pack.teamSize);
  const numTeams = Math.max(1, Math.ceil(players.length / teamSize));

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

  const ingredientIds = ingredients.map((i) => i.id);
  let ingredientIndex = 0;

  for (let ti = 0; ti < byTeam.length; ti++) {
    const memberIds = byTeam[ti]!;
    const teamId = teamIds[ti]!;
    for (const playerId of memberIds) {
      const ingredientId = ingredientIds[ingredientIndex % ingredientIds.length]!;
      ingredientIndex++;
      const { error: upErr } = await supabase
        .from("players")
        .update({ team_id: teamId, assigned_ingredient_id: ingredientId })
        .eq("id", playerId);
      if (upErr) throw upErr;
    }
  }
}

// =====================================================================
// lunch gameplay
// =====================================================================

export async function acquireIngredientForPlayer(args: {
  playerId: string;
  teamId: string;
  pack: ScenarioPack;
  ingredientId: string;
  answer: string;
  hintStageUsed: 1 | 2 | 3 | 4 | 5;
}) {
  const result = tryAcquireIngredient(
    args.pack,
    args.ingredientId,
    args.answer,
    args.hintStageUsed,
  );
  if (!result.ok) throw new Error(result.reason);

  const team = await getTeamById(args.teamId);
  const existing = team.acquired_ingredients;
  if (existing.some((a) => a.ingredientId === args.ingredientId)) {
    return result.record;
  }

  const { error } = await supabase
    .from("teams")
    .update({ acquired_ingredients: [...existing, result.record] })
    .eq("id", args.teamId);
  if (error) throw error;
  return result.record;
}

export async function completeMenuForTeam(args: {
  teamId: string;
  pack: ScenarioPack;
  menuId: string;
  submittedSteps: string[];
}) {
  const team = await getTeamById(args.teamId);
  if (team.completed_menus.some((m) => m.menuId === args.menuId)) {
    throw new Error("This menu is already completed.");
  }

  const result = tryCompleteMenu(
    args.pack,
    args.menuId,
    team.acquired_ingredients,
    args.submittedSteps,
  );
  if (!result.ok) throw new Error(result.reason);

  const { error } = await supabase
    .from("teams")
    .update({ completed_menus: [...team.completed_menus, result.record] })
    .eq("id", args.teamId);
  if (error) throw error;
  return result.record;
}

export async function submitTrayForTeam(teamId: string, pack: ScenarioPack) {
  const team = await getTeamById(teamId);
  if (team.tray_submitted_at) {
    throw new Error("급식판이 이미 제출되었습니다.");
  }
  const requiredMenuIds = pack.menus.map((m) => m.id);
  const completedIds = new Set(team.completed_menus.map((m) => m.menuId));
  const missing = requiredMenuIds.filter((id) => !completedIds.has(id));
  if (missing.length > 0) {
    throw new Error(`아직 완성하지 않은 메뉴가 있습니다: ${missing.join(", ")}`);
  }

  const { error } = await supabase
    .from("teams")
    .update({ tray_submitted_at: new Date().toISOString() })
    .eq("id", teamId);
  if (error) throw error;
}
