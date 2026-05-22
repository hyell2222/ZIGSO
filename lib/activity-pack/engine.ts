import type {
  AcquiredItem,
  CompletedTask,
  Item,
  ActivityPack,
  Task,
} from "@/lib/activity-pack/types";
import { PLAYER_MESSAGES } from "@/lib/activity-pack/player-messages";
import { scoreForClueLevel } from "@/lib/activity-pack/scoring";
import { isItemAnswerCorrect } from "@/lib/activity-pack/validate";

export function getItemById(pack: ActivityPack, itemId: string): Item | undefined {
  return pack.items.find((i) => i.id === itemId);
}

export function getTaskById(pack: ActivityPack, taskId: string): Task | undefined {
  return pack.tasks.find((t) => t.id === taskId);
}

export function clueTextForLevel(item: Item, level: 1 | 2 | 3 | 4 | 5): string {
  return item.clues[`stage${level}` as keyof typeof item.clues];
}

export function tryAcquireItem(
  pack: ActivityPack,
  itemId: string,
  answer: string,
  clueLevelUsed: 1 | 2 | 3 | 4 | 5,
): { ok: true; record: AcquiredItem } | { ok: false; reason: string } {
  const item = getItemById(pack, itemId);
  if (!item) return { ok: false, reason: PLAYER_MESSAGES.unknownItem };
  if (!isItemAnswerCorrect(item, answer)) {
    return { ok: false, reason: PLAYER_MESSAGES.incorrectAnswer };
  }
  return {
    ok: true,
    record: {
      itemId,
      clueLevelUsed,
      score: scoreForClueLevel(clueLevelUsed),
      acquiredAt: new Date().toISOString(),
    },
  };
}

export function taskSubmissionProgress(
  acquired: AcquiredItem[],
  task: Task,
): { required: number; acquired: number; ready: boolean } {
  const acquiredSet = new Set(acquired.map((a) => a.itemId));
  const required = task.acceptedItemIds.length;
  const acquiredCount = task.acceptedItemIds.filter((id) => acquiredSet.has(id)).length;
  return {
    required,
    acquired: acquiredCount,
    ready: required > 0 && acquiredCount === required,
  };
}

/** 필수 제출 아이템을 모두 획득했는지 */
export function groupHasItemsForTask(
  acquired: AcquiredItem[],
  task: Task,
): boolean {
  return taskSubmissionProgress(acquired, task).ready;
}

export function tryCompleteTask(
  pack: ActivityPack,
  taskId: string,
  acquired: AcquiredItem[],
  submittedItemIds: string[],
): { ok: true; record: CompletedTask } | { ok: false; reason: string } {
  const task = getTaskById(pack, taskId);
  if (!task) return { ok: false, reason: PLAYER_MESSAGES.unknownTask };

  const acquiredSet = new Set(acquired.map((a) => a.itemId));
  const required = task.acceptedItemIds;
  const requiredSet = new Set(required);
  const uniqueSubmitted = [...new Set(submittedItemIds)];

  if (required.length === 0) {
    return { ok: false, reason: PLAYER_MESSAGES.taskIncompleteSubmission };
  }

  for (const id of uniqueSubmitted) {
    if (!requiredSet.has(id)) {
      return { ok: false, reason: PLAYER_MESSAGES.taskInvalidItem };
    }
    if (!acquiredSet.has(id)) {
      return { ok: false, reason: PLAYER_MESSAGES.missingItems };
    }
  }

  if (uniqueSubmitted.length !== required.length) {
    return { ok: false, reason: PLAYER_MESSAGES.taskIncompleteSubmission };
  }

  for (const id of required) {
    if (!uniqueSubmitted.includes(id)) {
      return { ok: false, reason: PLAYER_MESSAGES.taskIncompleteSubmission };
    }
  }

  const score = required.length * 3;

  return {
    ok: true,
    record: {
      taskId,
      submittedItemIds: uniqueSubmitted,
      completedAt: new Date().toISOString(),
      score,
    },
  };
}

export type RoleAssignment = {
  roleId: string;
  itemIds: string[];
};

/** 한 모둠 안에서 역할·아이템 배정 (인원 부족 시 한 사람에게 여러 역할의 아이템) */
export function assignRolesToPlayers(
  pack: ActivityPack,
  playerIds: string[],
): Map<string, RoleAssignment> {
  const assignment = new Map<string, RoleAssignment>();
  const roles = pack.roles;
  if (roles.length === 0 || playerIds.length === 0) return assignment;

  const playerCount = playerIds.length;
  const roleCount = roles.length;

  if (playerCount >= roleCount) {
    let roleIndex = 0;
    for (const playerId of playerIds) {
      const role = roles[roleIndex % roleCount]!;
      const primaryItem = role.items[0];
      assignment.set(playerId, {
        roleId: role.id,
        itemIds: primaryItem ? [primaryItem.id] : [],
      });
      roleIndex++;
    }
    return assignment;
  }

  for (const playerId of playerIds) {
    assignment.set(playerId, { roleId: "", itemIds: [] });
  }
  for (let ri = 0; ri < roleCount; ri++) {
    const role = roles[ri]!;
    const primaryItem = role.items[0];
    if (!primaryItem) continue;
    const playerId = playerIds[ri % playerCount]!;
    const entry = assignment.get(playerId)!;
    if (!entry.roleId) entry.roleId = role.id;
    entry.itemIds.push(primaryItem.id);
  }
  for (const [, entry] of assignment) {
    if (!entry.roleId) {
      const role = roles.find((r) => r.items.some((i) => entry.itemIds.includes(i.id)));
      entry.roleId = role?.id ?? roles[0]!.id;
    }
  }
  return assignment;
}

/** @deprecated assignRolesToPlayers 사용 */
export function assignItemsToPlayers(
  pack: ActivityPack,
  playerIds: string[],
): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const [playerId, { itemIds }] of assignRolesToPlayers(pack, playerIds)) {
    map.set(playerId, itemIds);
  }
  return map;
}

export function totalGroupScore(
  acquired: AcquiredItem[],
  completed: CompletedTask[],
): number {
  return (
    acquired.reduce((sum, a) => sum + a.score, 0) +
    completed.reduce((sum, t) => sum + t.score, 0)
  );
}
