import {
  MAX_ITEMS_PER_ROLE,
  MIN_ITEMS_PER_ROLE,
} from "@/lib/activity-pack/roles";
import { MAX_ROLES_PER_GROUP, MIN_ROLES_PER_GROUP } from "@/lib/activity-pack/sizing";
import type { Item, ActivityPack, Task } from "@/lib/activity-pack/types";
import { ACTIVITY_PACK_VERSION } from "@/lib/activity-pack/types";

const HINT_KEYS = ["stage1", "stage2", "stage3", "stage4", "stage5"] as const;
const ITEM_CATEGORIES = ["primary", "secondary", "tertiary", "quaternary", "bonus", "other"] as const;

export type PackValidationIssue = { path: string; message: string };

export function validateActivityPack(pack: ActivityPack): PackValidationIssue[] {
  const issues: PackValidationIssue[] = [];

  if (pack.version !== ACTIVITY_PACK_VERSION) {
    issues.push({ path: "version", message: `version must be ${ACTIVITY_PACK_VERSION}` });
  }
  if (typeof pack.title !== "string" || !pack.title.trim()) {
    issues.push({ path: "title", message: "title is required" });
  }
  if (typeof pack.description !== "string") {
    issues.push({ path: "description", message: "description must be a string" });
  }

  const roleCount = pack.roles.length;
  if (roleCount < MIN_ROLES_PER_GROUP || roleCount > MAX_ROLES_PER_GROUP) {
    issues.push({
      path: "roles",
      message: `roles count must be ${MIN_ROLES_PER_GROUP}–${MAX_ROLES_PER_GROUP} (defines group size)`,
    });
  }
  if (pack.groupSize !== roleCount) {
    issues.push({
      path: "groupSize",
      message: "groupSize must equal roles.length",
    });
  }

  const maxPerRole = Math.max(1, ...pack.roles.map((r) => r.items.length));
  if (pack.itemsPerPlayer !== maxPerRole) {
    issues.push({
      path: "itemsPerPlayer",
      message: "itemsPerPlayer must equal max items per role",
    });
  }

  if (pack.tasks.length < 1) {
    issues.push({ path: "tasks", message: "at least one task required" });
  }

  const roleIds = new Set<string>();
  const itemIds = new Set<string>();

  for (let ri = 0; ri < pack.roles.length; ri++) {
    const role = pack.roles[ri]!;
    const rolePath = `roles[${ri}]`;
    if (typeof role.id !== "string" || !role.id.trim()) {
      issues.push({ path: `${rolePath}.id`, message: "id required" });
    } else if (roleIds.has(role.id)) {
      issues.push({ path: `${rolePath}.id`, message: "duplicate role id" });
    } else {
      roleIds.add(role.id);
    }
    if (typeof role.name !== "string") {
      issues.push({ path: `${rolePath}.name`, message: "name must be a string" });
    }
    if (role.items.length < MIN_ITEMS_PER_ROLE || role.items.length > MAX_ITEMS_PER_ROLE) {
      issues.push({
        path: `${rolePath}.items`,
        message: `each role must have ${MIN_ITEMS_PER_ROLE}–${MAX_ITEMS_PER_ROLE} items`,
      });
    }
    for (let ii = 0; ii < role.items.length; ii++) {
      issues.push(...validateItem(role.items[ii], `${rolePath}.items[${ii}]`, itemIds));
    }
  }

  if (pack.items.length !== itemIds.size) {
    issues.push({ path: "items", message: "flattened items must match role items" });
  }

  const taskIds = new Set<string>();
  for (let i = 0; i < pack.tasks.length; i++) {
    issues.push(...validateTask(pack.tasks[i], `tasks[${i}]`, taskIds, itemIds));
  }

  return issues;
}

function validateItem(raw: unknown, path: string, seenIds: Set<string>): PackValidationIssue[] {
  const issues: PackValidationIssue[] = [];
  if (!raw || typeof raw !== "object") {
    return [{ path, message: "must be an object" }];
  }
  const item = raw as Item;
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
  const hints = item.hints;
  if (!hints || typeof hints !== "object") {
    issues.push({ path: `${path}.hints`, message: "hints object required" });
  } else {
    for (const key of HINT_KEYS) {
      if (typeof hints[key] !== "string" || !hints[key].trim()) {
        issues.push({ path: `${path}.hints.${key}`, message: "hint text required" });
      }
    }
  }
  return issues;
}

function validateTask(
  raw: unknown,
  path: string,
  seenIds: Set<string>,
  itemIds: Set<string>,
): PackValidationIssue[] {
  const issues: PackValidationIssue[] = [];
  if (!raw || typeof raw !== "object") {
    return [{ path, message: "must be an object" }];
  }
  const task = raw as Task;
  if (typeof task.id !== "string" || !task.id.trim()) {
    issues.push({ path: `${path}.id`, message: "id required" });
  } else if (seenIds.has(task.id)) {
    issues.push({ path: `${path}.id`, message: "duplicate task id" });
  } else {
    seenIds.add(task.id);
  }
  if (typeof task.title !== "string" || !task.title.trim()) {
    issues.push({ path: `${path}.title`, message: "title required" });
  }
  if (typeof task.description !== "string") {
    issues.push({ path: `${path}.description`, message: "description must be a string" });
  }
  const accepted = Array.isArray(task.acceptedItemIds) ? task.acceptedItemIds : [];
  if (accepted.length < 1) {
    issues.push({ path: `${path}.acceptedItemIds`, message: "at least one accepted item" });
  }
  for (const id of accepted) {
    if (typeof id !== "string" || !itemIds.has(id)) {
      issues.push({ path: `${path}.acceptedItemIds`, message: `unknown item: ${id}` });
    }
  }
  const min = task.minimumItems;
  if (min != null && (typeof min !== "number" || min < 1 || min > accepted.length)) {
    issues.push({
      path: `${path}.minimumItems`,
      message: "minimumItems must be 1..acceptedItemIds.length",
    });
  }
  return issues;
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
