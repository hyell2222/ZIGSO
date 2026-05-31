import type {
  AcquiredItem,
  CompletedTask,
  Item,
  ActivityPack,
  Task,
} from "@/lib/activity-pack/types";
import { PLAYER_MESSAGES } from "@/lib/copy/player";
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

/** 한 모둠 안에서 역할·아이템 배정 (인원 불일치 시 한 역할에 여러 학생 배정) */
export function assignRolesToPlayers(
  pack: ActivityPack,
  playerIds: string[],
): Map<string, RoleAssignment> {
  const assignment = new Map<string, RoleAssignment>();
  const roles = pack.roles;
  if (roles.length === 0 || playerIds.length === 0) return assignment;

  const playerCount = playerIds.length;
  const roleCount = roles.length;

  let playerIndex = 0;
  for (let ri = 0; ri < roleCount && playerIndex < playerCount; ri++) {
    const remainingPlayers = playerCount - playerIndex;
    const remainingRoles = roleCount - ri;
    const playersForThisRole = Math.ceil(remainingPlayers / remainingRoles);

    for (let j = 0; j < playersForThisRole && playerIndex < playerCount; j++) {
      const playerId = playerIds[playerIndex]!;
      const role = roles[ri]!;
      const primaryItem = role.items[0];
      assignment.set(playerId, {
        roleId: role.id,
        itemIds: primaryItem ? [primaryItem.id] : [],
      });
      playerIndex++;
    }
  }

  return assignment;
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
