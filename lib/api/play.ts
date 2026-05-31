"use client";

import { parseActivityPack } from "@/lib/api/activities";
import {
  tryAcquireWordCard,
  tryPlaceWordCard,
  isWorksheetComplete,
  totalGroupScore,
  PLAYER_MESSAGES,
} from "@/lib/activity-pack/engine";
import { assignRolesToPlayers, computeSessionGroupCount } from "@/lib/activity-pack/engine";
import type {
  ActivityPack,
  WordCard,
  WorksheetPlacement,
} from "@/lib/activity-pack/types";
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
  word_cards: WordCard[];
  is_online: boolean | null;
  created_at: string;
};

const PLAYER_SELECT =
  "id,nickname,session_id,group_id,assigned_role_id,assigned_item_ids,word_cards,is_online,created_at";

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

const PLAYER_SELECT_WITH_GROUP = `${PLAYER_SELECT},groups(id,name,worksheet_placements,completed_at)`;

export type SessionPlayerRow = PlayerSelfRow & {
  groups: {
    id: string;
    name: string | null;
    worksheet_placements: WorksheetPlacement[] | null;
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
  return {
    ...(data as PlayerSelfRow),
    word_cards: parseWordCards(data?.word_cards),
  };
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
  worksheet_placements: WorksheetPlacement[];
  completed_at: string | null;
};

const GROUP_SELECT = "id,session_id,name,worksheet_placements,completed_at";

function parseWordCards(raw: unknown): WordCard[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((row) => {
    const r = row as Record<string, unknown>;
    return {
      itemId: String(r.itemId ?? ""),
      clueLevelUsed: (typeof r.clueLevelUsed === "number"
        ? Math.min(5, Math.max(1, Math.floor(r.clueLevelUsed)))
        : 5) as 1 | 2 | 3 | 4 | 5,
      score: typeof r.score === "number" ? r.score : 0,
      acquiredAt: String(r.acquiredAt ?? new Date().toISOString()),
      placedAt: typeof r.placedAt === "string" ? r.placedAt : undefined,
    };
  });
}

function parsePlacements(raw: unknown): WorksheetPlacement[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((row) => {
    const r = row as Record<string, unknown>;
    return {
      slotId: String(r.slotId ?? ""),
      itemId: String(r.itemId ?? ""),
      placedByPlayerId: String(r.placedByPlayerId ?? ""),
      placedAt: String(r.placedAt ?? new Date().toISOString()),
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
    worksheet_placements: parsePlacements(row.worksheet_placements),
  })) as GroupRow[];
}

export async function getGroupById(groupId: string) {
  const { data, error } = await supabase.from("groups").select(GROUP_SELECT).eq("id", groupId).single();
  if (error) throw error;
  return {
    ...data,
    worksheet_placements: parsePlacements(data.worksheet_placements),
  } as GroupRow;
}

export async function listGroupMembers(groupId: string): Promise<PlayerSelfRow[]> {
  const { data, error } = await supabase
    .from("players")
    .select(PLAYER_SELECT)
    .eq("group_id", groupId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    ...(row as PlayerSelfRow),
    word_cards: parseWordCards(row.word_cards),
  }));
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
    throw new Error("활동에 역할이 없습니다.");
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

  const roleCount = Math.max(2, pack.groupSize);
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

export async function acquireWordCardForPlayer(args: {
  playerId: string;
  groupId: string;
  pack: ActivityPack;
  itemId: string;
  answer: string;
  clueLevelUsed: 1 | 2 | 3 | 4 | 5;
}) {
  const result = tryAcquireWordCard(
    args.pack,
    args.itemId,
    args.answer,
    args.clueLevelUsed,
  );
  if (!result.ok) throw new Error(result.reason);

  const { data: player, error: pe } = await supabase
    .from("players")
    .select("word_cards")
    .eq("id", args.playerId)
    .single();
  if (pe) throw pe;

  const existing = parseWordCards(player?.word_cards);
  if (existing.some((c) => c.itemId === args.itemId && !c.placedAt)) {
    return result.record;
  }

  const { error } = await supabase
    .from("players")
    .update({ word_cards: [...existing, result.record] })
    .eq("id", args.playerId);
  if (error) throw error;

  return result.record;
}

export async function placeWordCardOnSlot(args: {
  actorPlayerId: string;
  slotOwnerPlayerId: string;
  groupId: string;
  pack: ActivityPack;
  slotId: string;
  itemId: string;
}) {
  const [group, actorRow, ownerRow] = await Promise.all([
    getGroupById(args.groupId),
    getPlayerById(args.actorPlayerId),
    getPlayerById(args.slotOwnerPlayerId),
  ]);

  const actorCards = actorRow.word_cards ?? [];
  const placements = group.worksheet_placements;

  const result = tryPlaceWordCard(args.pack, actorCards, placements, {
    actorPlayerId: args.actorPlayerId,
    slotOwnerPlayerId: args.slotOwnerPlayerId,
    slotOwnerRoleId: ownerRow.assigned_role_id ?? "",
    slotId: args.slotId,
    itemId: args.itemId,
  });
  if (!result.ok) throw new Error(result.reason);

  const updatedCards = actorCards.map((c) =>
    c.itemId === args.itemId && !c.placedAt ? result.updatedCard : c,
  );

  const { error: actorErr } = await supabase
    .from("players")
    .update({ word_cards: updatedCards })
    .eq("id", args.actorPlayerId);
  if (actorErr) throw actorErr;

  const { error: groupErr } = await supabase
    .from("groups")
    .update({ worksheet_placements: [...placements, result.record] })
    .eq("id", args.groupId);
  if (groupErr) throw groupErr;

  return result.record;
}

export async function completeActivityForGroup(groupId: string, pack: ActivityPack) {
  const group = await getGroupById(groupId);
  if (group.completed_at) {
    throw new Error("이미 활동을 완료했습니다.");
  }
  if (!isWorksheetComplete(pack, group.worksheet_placements)) {
    throw new Error(PLAYER_MESSAGES.worksheetIncomplete);
  }

  const { error } = await supabase
    .from("groups")
    .update({ completed_at: new Date().toISOString() })
    .eq("id", groupId);
  if (error) throw error;
}

export { totalGroupScore };
