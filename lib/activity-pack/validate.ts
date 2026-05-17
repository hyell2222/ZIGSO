import type { Item, ActivityPack, Task } from "@/lib/activity-pack/types";
import { ACTIVITY_PACK_VERSION } from "@/lib/activity-pack/types";

const HINT_KEYS = ["stage1", "stage2", "stage3", "stage4", "stage5"] as const;
const TASK_SLOTS = ["slot1", "slot2", "slot3", "slot4", "slot5", "slot6"] as const;
const ITEM_CATEGORIES = ["primary", "secondary", "tertiary", "quaternary", "bonus", "other"] as const;

export type PackValidationIssue = { path: string; message: string };

export function validateActivityPack(pack: unknown): PackValidationIssue[] {
  const issues: PackValidationIssue[] = [];
  if (!pack || typeof pack !== "object") {
    return [{ path: "", message: "pack must be an object" }];
  }
  const p = pack as Record<string, unknown>;

  if (p.version !== ACTIVITY_PACK_VERSION) {
    issues.push({ path: "version", message: `version must be ${ACTIVITY_PACK_VERSION}` });
  }
  if (typeof p.title !== "string" || !p.title.trim()) {
    issues.push({ path: "title", message: "title is required" });
  }
  if (typeof p.description !== "string") {
    issues.push({ path: "description", message: "description must be a string" });
  }
  if (!["Easy", "Normal", "Hard"].includes(p.difficulty as string)) {
    issues.push({ path: "difficulty", message: "difficulty must be Easy | Normal | Hard" });
  }
  if (typeof p.groupSize !== "number" || p.groupSize < 2 || p.groupSize > 12) {
    issues.push({ path: "groupSize", message: "groupSize must be 2–12" });
  }

  const items = Array.isArray(p.items) ? p.items : [];
  const tasks = Array.isArray(p.tasks) ? p.tasks : [];
  const actionCards = Array.isArray(p.actionCards) ? p.actionCards : [];

  if (items.length < 1) {
    issues.push({ path: "items", message: "at least one item required" });
  }
  if (tasks.length < 1) {
    issues.push({ path: "tasks", message: "at least one task required" });
  }

  const itemIds = new Set<string>();
  for (let i = 0; i < items.length; i++) {
    issues.push(...validateItem(items[i], `items[${i}]`, itemIds));
  }

  const taskIds = new Set<string>();
  const usedSlots = new Set<string>();
  for (let i = 0; i < tasks.length; i++) {
    issues.push(...validateTask(tasks[i], `tasks[${i}]`, taskIds, usedSlots, itemIds));
  }

  for (let i = 0; i < actionCards.length; i++) {
    const c = actionCards[i];
    if (!c || typeof c !== "object") {
      issues.push({ path: `actionCards[${i}]`, message: "must be an object" });
      continue;
    }
    const card = c as Record<string, unknown>;
    if (typeof card.id !== "string" || !card.id.trim()) {
      issues.push({ path: `actionCards[${i}].id`, message: "id required" });
    }
    if (typeof card.text !== "string" || !card.text.trim()) {
      issues.push({ path: `actionCards[${i}].text`, message: "text required" });
    }
  }

  return issues;
}

function validateItem(raw: unknown, path: string, seenIds: Set<string>): PackValidationIssue[] {
  const issues: PackValidationIssue[] = [];
  if (!raw || typeof raw !== "object") {
    return [{ path, message: "must be an object" }];
  }
  const item = raw as Record<string, unknown>;
  if (typeof item.id !== "string" || !item.id.trim()) {
    issues.push({ path: `${path}.id`, message: "id required" });
  } else if (seenIds.has(item.id)) {
    issues.push({ path: `${path}.id`, message: "duplicate item id" });
  } else {
    seenIds.add(item.id);
  }
  if (typeof item.name !== "string" || !item.name.trim()) {
    issues.push({ path: `${path}.name`, message: "name required" });
  }
  if (!ITEM_CATEGORIES.includes(item.category as (typeof ITEM_CATEGORIES)[number])) {
    issues.push({ path: `${path}.category`, message: "invalid category" });
  }
  const hints = item.hints;
  if (!hints || typeof hints !== "object") {
    issues.push({ path: `${path}.hints`, message: "hints object required" });
  } else {
    const h = hints as Record<string, unknown>;
    for (const key of HINT_KEYS) {
      if (typeof h[key] !== "string" || !(h[key] as string).trim()) {
        issues.push({ path: `${path}.hints.${key}`, message: "hint text required" });
      }
    }
  }
  if (typeof item.groupHint !== "string" || !item.groupHint.trim()) {
    issues.push({ path: `${path}.groupHint`, message: "groupHint required" });
  }
  return issues;
}

function validateTask(
  raw: unknown,
  path: string,
  seenTaskIds: Set<string>,
  usedSlots: Set<string>,
  itemIds: Set<string>,
): PackValidationIssue[] {
  const issues: PackValidationIssue[] = [];
  if (!raw || typeof raw !== "object") {
    return [{ path, message: "must be an object" }];
  }
  const task = raw as Record<string, unknown>;
  if (typeof task.id !== "string" || !task.id.trim()) {
    issues.push({ path: `${path}.id`, message: "id required" });
  } else if (seenTaskIds.has(task.id)) {
    issues.push({ path: `${path}.id`, message: "duplicate task id" });
  } else {
    seenTaskIds.add(task.id);
  }
  if (typeof task.name !== "string" || !task.name.trim()) {
    issues.push({ path: `${path}.name`, message: "name required" });
  }
  const slot = task.slot as string;
  if (!TASK_SLOTS.includes(slot as (typeof TASK_SLOTS)[number])) {
    issues.push({ path: `${path}.slot`, message: "invalid slot" });
  } else if (usedSlots.has(slot)) {
    issues.push({ path: `${path}.slot`, message: `duplicate slot: ${slot}` });
  } else {
    usedSlots.add(slot);
  }
  const ids = Array.isArray(task.itemIds) ? task.itemIds : [];
  if (ids.length < 1) {
    issues.push({ path: `${path}.itemIds`, message: "at least one item" });
  }
  for (const id of ids) {
    if (typeof id !== "string" || !itemIds.has(id)) {
      issues.push({ path: `${path}.itemIds`, message: `unknown item: ${id}` });
    }
  }
  const steps = Array.isArray(task.steps) ? task.steps : [];
  if (steps.length < 1) {
    issues.push({ path: `${path}.steps`, message: "at least one step" });
  }
  return issues;
}

export function isValidActivityPack(pack: unknown): pack is ActivityPack {
  return validateActivityPack(pack).length === 0;
}

export function normalizeItemAnswer(answer: string): string {
  return answer.trim().toLowerCase().replace(/\s+/g, " ");
}

export function isItemAnswerCorrect(item: Item, answer: string): boolean {
  const normalized = normalizeItemAnswer(answer);
  const candidates = [item.name, item.id.replace(/_/g, " "), ...(item.aliases ?? [])].map(
    normalizeItemAnswer,
  );
  return candidates.some((c) => c === normalized);
}
