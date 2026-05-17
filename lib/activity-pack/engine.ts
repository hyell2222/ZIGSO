import type {
  AcquiredItem,
  CompletedTask,
  Item,
  ActivityPack,
  Task,
} from "@/lib/activity-pack/types";
import { PLAYER_MESSAGES } from "@/lib/activity-pack/player-messages";
import { scoreForHintLevel } from "@/lib/activity-pack/scoring";
import { isItemAnswerCorrect } from "@/lib/activity-pack/validate";

export function getItemById(pack: ActivityPack, itemId: string): Item | undefined {
  return pack.items.find((i) => i.id === itemId);
}

export function getTaskById(pack: ActivityPack, taskId: string): Task | undefined {
  return pack.tasks.find((t) => t.id === taskId);
}

export function hintTextForLevel(item: Item, level: 1 | 2 | 3 | 4 | 5): string {
  return item.hints[`stage${level}` as keyof typeof item.hints];
}

export function tryAcquireItem(
  pack: ActivityPack,
  itemId: string,
  answer: string,
  hintLevelUsed: 1 | 2 | 3 | 4 | 5,
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
      hintLevelUsed,
      score: scoreForHintLevel(hintLevelUsed),
      acquiredAt: new Date().toISOString(),
    },
  };
}

export function groupHasItemsForTask(
  acquired: AcquiredItem[],
  task: Task,
): boolean {
  const acquiredSet = new Set(acquired.map((a) => a.itemId));
  const min = task.minimumItems ?? 1;
  const eligible = task.acceptedItemIds.filter((id) => acquiredSet.has(id));
  return eligible.length >= min;
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
  const accepted = new Set(task.acceptedItemIds);
  const uniqueSubmitted = [...new Set(submittedItemIds)];

  const min = task.minimumItems ?? 1;
  if (uniqueSubmitted.length < min) {
    return { ok: false, reason: PLAYER_MESSAGES.taskTooFewItems };
  }

  for (const id of uniqueSubmitted) {
    if (!accepted.has(id)) {
      return { ok: false, reason: PLAYER_MESSAGES.taskInvalidItem };
    }
    if (!acquiredSet.has(id)) {
      return { ok: false, reason: PLAYER_MESSAGES.missingItems };
    }
  }

  const score = uniqueSubmitted.length * 3;

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

/** 한 모둠 안에서 플레이어당 역할 1개 + 해당 역할의 모든 아이템 배정 */
export function assignRolesToPlayers(
  pack: ActivityPack,
  playerIds: string[],
): Map<string, RoleAssignment> {
  const assignment = new Map<string, RoleAssignment>();
  const roles = pack.roles;
  if (roles.length === 0 || playerIds.length === 0) return assignment;

  let roleIndex = 0;
  for (const playerId of playerIds) {
    const role = roles[roleIndex % roles.length]!;
    assignment.set(playerId, {
      roleId: role.id,
      itemIds: role.items.map((i) => i.id),
    });
    roleIndex++;
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
