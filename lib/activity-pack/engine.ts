import type {
  AcquiredItem,
  CompletedTask,
  Item,
  ActivityPack,
  Task,
} from "@/lib/activity-pack/types";
import { PLAYER_MESSAGES } from "@/lib/activity-pack/player-messages";
import { normalizeSentence, scoreForHintLevel, scoreTaskCompletion } from "@/lib/activity-pack/scoring";
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

export function groupHasItemsForTask(acquired: AcquiredItem[], task: Task): boolean {
  const ids = new Set(acquired.map((a) => a.itemId));
  return task.itemIds.every((id) => ids.has(id));
}

export function tryCompleteTask(
  pack: ActivityPack,
  taskId: string,
  acquired: AcquiredItem[],
  submittedSteps: string[],
): { ok: true; record: CompletedTask } | { ok: false; reason: string } {
  const task = getTaskById(pack, taskId);
  if (!task) return { ok: false, reason: PLAYER_MESSAGES.unknownTask };
  if (!groupHasItemsForTask(acquired, task)) {
    return { ok: false, reason: PLAYER_MESSAGES.missingItems };
  }
  const correctSteps = task.steps.map((s) => s.sentence);
  const score = scoreTaskCompletion(correctSteps, submittedSteps);
  const allCorrect =
    correctSteps.length === submittedSteps.length &&
    correctSteps.every((s, i) => normalizeSentence(s) === normalizeSentence(submittedSteps[i] ?? ""));
  if (!allCorrect) {
    return { ok: false, reason: PLAYER_MESSAGES.taskStepsMismatch };
  }
  return {
    ok: true,
    record: {
      taskId,
      submittedSteps,
      completedAt: new Date().toISOString(),
      score,
    },
  };
}

/** 직소: 모둠 인원에 맞게 전문가 역할(항목)을 순환 배정 */
export function assignRolesToPlayers(
  pack: ActivityPack,
  playerIds: string[],
): Map<string, string> {
  const assignment = new Map<string, string>();
  const items = pack.items;
  if (items.length === 0 || playerIds.length === 0) return assignment;
  playerIds.forEach((playerId, index) => {
    assignment.set(playerId, items[index % items.length]!.id);
  });
  return assignment;
}

export function totalGroupScore(acquired: AcquiredItem[], completed: CompletedTask[]): number {
  return (
    acquired.reduce((sum, a) => sum + a.score, 0) +
    completed.reduce((sum, t) => sum + t.score, 0)
  );
}
