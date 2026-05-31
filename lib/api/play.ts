"use client";

import { parseActivityPack } from "@/lib/api/activities";
import { tryAcquireItem, tryCompleteTask } from "@/lib/activity-pack/engine";
import { assignRolesToPlayers } from "@/lib/activity-pack/engine";
import { ERROR_COPY } from "@/lib/copy/errors";
import { PLAYER_MESSAGES } from "@/lib/copy/player";
import type { AcquiredItem, CompletedTask, ActivityPack } from "@/lib/activity-pack/types";
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
  assigned_item_ids: string[] | null;
  is_online: boolean | null;
  created_at: string;
};

const PLAYER_SELECT =
  "id,nickname,session_id,group_id,assigned_role_id,assigned_item_ids,is_online,created_at";

export function parseAssignedItemIds(player: {
  assigned_item_ids?: unknown;
  assigned_role_id?: string | null;
}): string[] {
  if (Array.isArray(player.assigned_item_ids)) {
    return player.assigned_item_ids.filter((id): id is string => typeof id === "string" && id.length > 0);
  }
  if (player.assigned_role_id) return [player.assigned_role_id];
  return [];
}

const PLAYER_SELECT_WITH_GROUP = `${PLAYER_SELECT},groups(id,name,acquired_items,completed_tasks,completed_at)`;

export type SessionPlayerRow = PlayerSelfRow & {
  groups: {
    id: string;
    name: string | null;
    acquired_items: AcquiredItem[] | null;
    completed_tasks: CompletedTask[] | null;
    completed_at: string | null;
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
    .select(PLAYER_SELECT_WITH_GROUP)
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
  const orphans = (playerRows ?? []).filter(
    (p) => !p.group_id || parseAssignedItemIds(p).length === 0,
  );
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
  acquired_items: AcquiredItem[];
  completed_tasks: CompletedTask[];
  completed_at: string | null;
};

const GROUP_SELECT =
  "id,session_id,name,acquired_items,completed_tasks,completed_at";

function parseAcquired(raw: unknown): AcquiredItem[] {
  return Array.isArray(raw) ? (raw as AcquiredItem[]) : [];
}

function parseCompleted(raw: unknown): CompletedTask[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((row) => {
    const r = row as Record<string, unknown>;
    const taskId = String(r.taskId ?? "");
    return {
      taskId,
      submittedItemIds: Array.isArray(r.submittedItemIds)
        ? (r.submittedItemIds as string[])
        : Array.isArray(r.submittedSteps)
          ? []
          : [],
      completedAt: String(r.completedAt ?? new Date().toISOString()),
      score: typeof r.score === "number" ? r.score : 0,
    };
  });
}

export async function listSessionGroups(sessionId: string) {
  const { data, error } = await supabase
    .from("groups")
    .select(GROUP_SELECT)
    .eq("session_id", sessionId)
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    ...row,
    acquired_items: parseAcquired(row.acquired_items),
    completed_tasks: parseCompleted(row.completed_tasks),
  })) as GroupRow[];
}

export async function getGroupById(groupId: string) {
  const { data, error } = await supabase.from("groups").select(GROUP_SELECT).eq("id", groupId).single();
  if (error) throw error;
  return {
    ...data,
    acquired_items: parseAcquired(data.acquired_items),
    completed_tasks: parseCompleted(data.completed_tasks),
  } as GroupRow;
}

// =====================================================================
// group assignment
// =====================================================================

function groupLabel(index: number) {
  const A = "A".charCodeAt(0);
  if (index < 26) return String.fromCharCode(A + index);
  const first = Math.floor(index / 26) - 1;
  const second = index % 26;
  return `${String.fromCharCode(A + first)}${String.fromCharCode(A + second)}`;
}

export async function assignGroupsAndRoles(sessionId: string, pack: ActivityPack) {
  if (pack.roles.length === 0) {
    throw new Error(ERROR_COPY.packNoRoles);
  }

  const { data: allPlayers, error: pErr } = await supabase
    .from("players")
    .select("id,group_id,assigned_role_id")
    .eq("session_id", sessionId);
  if (pErr) throw pErr;
  const players = allPlayers ?? [];
  if (players.length === 0) return;

  const needsAssign = players.filter(
    (p) => !p.group_id || parseAssignedItemIds(p).length === 0,
  );
  if (needsAssign.length === 0) return;

  const { data: existingGroups, error: tErr } = await supabase
    .from("groups")
    .select("id,name")
    .eq("session_id", sessionId);
  if (tErr) throw tErr;

  const groupSize = Math.max(2, pack.groupSize);
  const shuffled = [...players].sort(() => Math.random() - 0.5);
  const numGroups = Math.max(1, Math.ceil(shuffled.length / groupSize));

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
      const assignedIds = assigned?.itemIds ?? [];
      const { error: upErr } = await supabase
        .from("players")
        .update({
          group_id: groupId,
          assigned_item_ids: assignedIds,
          assigned_role_id: assigned?.roleId ?? null,
        })
        .eq("id", playerId);
      if (upErr) throw upErr;
    }
  }
}

// =====================================================================
// gameplay
// =====================================================================

export async function acquireItemForPlayer(args: {
  playerId: string;
  groupId: string;
  pack: ActivityPack;
  itemId: string;
  answer: string;
  clueLevelUsed: 1 | 2 | 3 | 4 | 5;
}) {
  const result = tryAcquireItem(
    args.pack,
    args.itemId,
    args.answer,
    args.clueLevelUsed,
  );
  if (!result.ok) throw new Error(result.reason);

  const group = await getGroupById(args.groupId);
  const existing = group.acquired_items;
  if (existing.some((a) => a.itemId === args.itemId)) {
    return result.record;
  }

  const { error } = await supabase
    .from("groups")
    .update({ acquired_items: [...existing, result.record] })
    .eq("id", args.groupId);
  if (error) throw error;
  return result.record;
}

export async function completeTaskForGroup(args: {
  groupId: string;
  pack: ActivityPack;
  taskId: string;
  submittedItemIds: string[];
}) {
  const group = await getGroupById(args.groupId);
  if (group.completed_tasks.some((m) => m.taskId === args.taskId)) {
    throw new Error(PLAYER_MESSAGES.taskAlreadyCompleted);
  }

  const result = tryCompleteTask(
    args.pack,
    args.taskId,
    group.acquired_items,
    args.submittedItemIds,
  );
  if (!result.ok) throw new Error(result.reason);

  const { error } = await supabase
    .from("groups")
    .update({ completed_tasks: [...group.completed_tasks, result.record] })
    .eq("id", args.groupId);
  if (error) throw error;
  return result.record;
}

export async function completeActivityForGroup(groupId: string, pack: ActivityPack) {
  const group = await getGroupById(groupId);
  if (group.completed_at) {
    throw new Error(ERROR_COPY.activityAlreadyComplete);
  }
  const requiredIds = pack.tasks.map((t) => t.id);
  const completedIds = new Set(group.completed_tasks.map((t) => t.taskId));
  const missing = requiredIds.filter((id) => !completedIds.has(id));
  if (missing.length > 0) {
    throw new Error(ERROR_COPY.missionsIncomplete(missing));
  }

  const { error } = await supabase
    .from("groups")
    .update({ completed_at: new Date().toISOString() })
    .eq("id", groupId);
  if (error) throw error;
}
