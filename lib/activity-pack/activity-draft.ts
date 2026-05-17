import type { ItemHints, Item, ActivityPack, Task, TaskSlot, TaskStep } from "@/lib/activity-pack/types";
import { ACTIVITY_PACK_VERSION } from "@/lib/activity-pack/types";
import { makeTempId } from "@/lib/temp-id";

export type { TaskSlot };

export const TASK_SLOTS: TaskSlot[] = ["slot1", "slot2", "slot3", "slot4", "slot5", "slot6"];

export const TASK_SLOT_LABELS: Record<TaskSlot, string> = {
  slot1: "주제 1",
  slot2: "주제 2",
  slot3: "주제 3",
  slot4: "주제 4",
  slot5: "주제 5",
  slot6: "주제 6",
};

export const HINT_STAGE_LABELS: Record<keyof ItemHints, string> = {
  stage1: "1단계 힌트 (5점 · 가장 어려움)",
  stage2: "2단계 힌트 (4점)",
  stage3: "3단계 힌트 (3점)",
  stage4: "4단계 힌트 (2점)",
  stage5: "5단계 힌트 (1점 · 가장 쉬움)",
};

export type EditorItem = {
  localId: string;
  id: string;
  name: string;
  hints: ItemHints;
  groupHint: string;
};

export type EditorTask = {
  localId: string;
  id: string;
  name: string;
  slot: TaskSlot;
  items: EditorItem[];
  steps: string[];
};

export type ActivityEditorDraft = {
  groupSize: number;
  difficulty: "Easy" | "Normal" | "Hard";
  tasks: EditorTask[];
};

const EMPTY_HINTS = (): ItemHints => ({
  stage1: "",
  stage2: "",
  stage3: "",
  stage4: "",
  stage5: "",
});

export function createEmptyItem(): EditorItem {
  return {
    localId: makeTempId(),
    id: "",
    name: "",
    hints: EMPTY_HINTS(),
    groupHint: "",
  };
}

export function createEmptyTask(slot: TaskSlot): EditorTask {
  return {
    localId: makeTempId(),
    id: "",
    name: "",
    slot,
    items: [createEmptyItem()],
    steps: [""],
  };
}

export function createDefaultActivityDraft(): ActivityEditorDraft {
  return {
    groupSize: 4,
    difficulty: "Normal",
    tasks: TASK_SLOTS.map((slot) => createEmptyTask(slot)),
  };
}

function slugFromName(name: string, fallback: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 48);
  return slug || fallback;
}

function categoryForSlot(slot: TaskSlot): Item["category"] {
  if (slot === "slot1") return "primary";
  if (slot === "slot2") return "secondary";
  if (slot === "slot6") return "bonus";
  return "tertiary";
}

export function packToEditorDraft(pack: ActivityPack): ActivityEditorDraft {
  const itemById = new Map(pack.items.map((i) => [i.id, i]));

  const tasks: EditorTask[] = pack.tasks.map((task) => ({
    localId: makeTempId(),
    id: task.id,
    name: task.name,
    slot: task.slot,
    items: task.itemIds.map((itemId) => {
      const item = itemById.get(itemId);
      return {
        localId: makeTempId(),
        id: item?.id ?? itemId,
        name: item?.name ?? "",
        hints: item?.hints ?? EMPTY_HINTS(),
        groupHint: item?.groupHint ?? "",
      };
    }),
    steps:
      task.steps.length > 0
        ? [...task.steps].sort((a, b) => a.order - b.order).map((s) => s.sentence)
        : [""],
  }));

  return {
    groupSize: pack.groupSize,
    difficulty: pack.difficulty,
    tasks: tasks.length > 0 ? tasks : createDefaultActivityDraft().tasks,
  };
}

export function editorDraftToPack(draft: ActivityEditorDraft): ActivityPack {
  const usedItemIds = new Set<string>();
  const allItems: Item[] = [];
  const tasks: Task[] = [];
  const actionTexts = new Set<string>();

  for (const task of draft.tasks) {
    const taskId = slugFromName(task.name, task.slot);
    const itemIds: string[] = [];

    for (let i = 0; i < task.items.length; i++) {
      const raw = task.items[i]!;
      const baseId = slugFromName(raw.name, `${task.slot}_item_${i + 1}`);
      let id = baseId;
      let n = 2;
      while (usedItemIds.has(id)) {
        id = `${baseId}_${n}`;
        n++;
      }
      usedItemIds.add(id);
      itemIds.push(id);

      allItems.push({
        id,
        name: raw.name.trim(),
        category: categoryForSlot(task.slot),
        hints: {
          stage1: raw.hints.stage1.trim(),
          stage2: raw.hints.stage2.trim(),
          stage3: raw.hints.stage3.trim(),
          stage4: raw.hints.stage4.trim(),
          stage5: raw.hints.stage5.trim(),
        },
        groupHint: raw.groupHint.trim(),
      });
    }

    const steps: TaskStep[] = task.steps
      .map((s) => s.trim())
      .filter(Boolean)
      .map((sentence, idx) => {
        actionTexts.add(sentence);
        return { order: idx + 1, sentence };
      });

    tasks.push({
      id: taskId,
      name: task.name.trim(),
      slot: task.slot,
      itemIds,
      steps,
    });
  }

  const taskNames = tasks.map((t) => t.name).filter(Boolean);
  const title =
    taskNames.length > 0 ? `활동: ${taskNames.slice(0, 3).join(", ")}` : "새 직소 활동";

  const actionCards = [...actionTexts].map((text, idx) => ({
    id: slugFromName(text, `step_${idx + 1}`),
    text,
  }));

  return {
    version: ACTIVITY_PACK_VERSION,
    title,
    description:
      "전문가 집단에서 정보를 맞추고, 조로 돌아와 팀 과제를 완성하는 직소 협동 활동입니다.",
    difficulty: draft.difficulty,
    groupSize: draft.groupSize,
    tasks,
    items: allItems,
    actionCards,
  };
}

export function validateEditorDraft(draft: ActivityEditorDraft): string[] {
  const errors: string[] = [];
  if (draft.tasks.length === 0) {
    errors.push("과제를 한 가지 이상 추가하세요.");
    return errors;
  }

  const slots = new Set<TaskSlot>();
  for (const task of draft.tasks) {
    if (!task.name.trim()) errors.push(`「${TASK_SLOT_LABELS[task.slot]}」과제 이름을 입력하세요.`);
    if (slots.has(task.slot)) errors.push(`슬롯 ${TASK_SLOT_LABELS[task.slot]}이(가) 중복되었습니다.`);
    slots.add(task.slot);

    if (task.items.length === 0) {
      errors.push(
        `「${task.name || TASK_SLOT_LABELS[task.slot]}」에 맞출 항목을 한 가지 이상 추가하세요.`,
      );
    }
    for (const item of task.items) {
      if (!item.name.trim()) {
        errors.push(
          `「${task.name || TASK_SLOT_LABELS[task.slot]}」의 맞출 항목 이름을 입력하세요.`,
        );
      }
      for (const [key, label] of Object.entries(HINT_STAGE_LABELS) as [keyof ItemHints, string][]) {
        if (!item.hints[key].trim()) {
          errors.push(
            `「${task.name || TASK_SLOT_LABELS[task.slot]}」·${item.name || "항목"} — ${label}을(를) 입력하세요.`,
          );
        }
      }
    }

    const steps = task.steps.map((s) => s.trim()).filter(Boolean);
    if (steps.length === 0) {
      errors.push(
        `「${task.name || TASK_SLOT_LABELS[task.slot]}」에 수행 순서를 한 단계 이상 입력하세요.`,
      );
    }
  }

  return errors;
}
