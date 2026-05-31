import {
  MAX_ITEMS_PER_ROLE,
  MIN_ITEMS_PER_ROLE,
} from "@/lib/activity-pack/roles";
import { MAX_ROLES_PER_GROUP, MIN_ROLES_PER_GROUP } from "@/lib/activity-pack/sizing";
import { extractSlotIdsFromPassage } from "@/lib/activity-pack/worksheet";
import type { ActivityPack, HomeWorksheet, Item, WorksheetSlot } from "@/lib/activity-pack/types";
import { ACTIVITY_PACK_VERSION } from "@/lib/activity-pack/types";

const HINT_KEYS = ["stage1", "stage2", "stage3", "stage4", "stage5"] as const;

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

  issues.push(...validateHomeWorksheet(pack.homeWorksheet, itemIds, roleIds));

  return issues;
}

function validateHomeWorksheet(
  worksheet: HomeWorksheet,
  itemIds: Set<string>,
  roleIds: Set<string>,
): PackValidationIssue[] {
  const issues: PackValidationIssue[] = [];
  if (!worksheet || typeof worksheet !== "object") {
    return [{ path: "homeWorksheet", message: "homeWorksheet required" }];
  }
  if (typeof worksheet.summaryPassage !== "string" || !worksheet.summaryPassage.trim()) {
    issues.push({ path: "homeWorksheet.summaryPassage", message: "summaryPassage required" });
  }
  if (!Array.isArray(worksheet.slots) || worksheet.slots.length < 1) {
    issues.push({ path: "homeWorksheet.slots", message: "at least one slot required" });
  }

  const tokenIds = extractSlotIdsFromPassage(worksheet.summaryPassage ?? "");
  const slotIds = new Set<string>();
  for (let i = 0; i < (worksheet.slots?.length ?? 0); i++) {
    const slot = worksheet.slots[i] as WorksheetSlot;
    const path = `homeWorksheet.slots[${i}]`;
    if (typeof slot.id !== "string" || !slot.id.trim()) {
      issues.push({ path: `${path}.id`, message: "slot id required" });
    } else if (slotIds.has(slot.id)) {
      issues.push({ path: `${path}.id`, message: "duplicate slot id" });
    } else {
      slotIds.add(slot.id);
    }
    if (typeof slot.itemId !== "string" || !itemIds.has(slot.itemId)) {
      issues.push({ path: `${path}.itemId`, message: `unknown item: ${slot.itemId}` });
    }
    if (typeof slot.ownerRoleId !== "string" || !roleIds.has(slot.ownerRoleId)) {
      issues.push({ path: `${path}.ownerRoleId`, message: `unknown role: ${slot.ownerRoleId}` });
    }
  }

  for (const tokenId of tokenIds) {
    if (!slotIds.has(tokenId)) {
      issues.push({
        path: "homeWorksheet.summaryPassage",
        message: `passage references unknown slot: ${tokenId}`,
      });
    }
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
  const clues = item.clues;
  if (!clues || typeof clues !== "object") {
    issues.push({ path: `${path}.clues`, message: "clues object required" });
  } else {
    for (const key of HINT_KEYS) {
      if (typeof clues[key] !== "string" || !clues[key].trim()) {
        issues.push({ path: `${path}.clues.${key}`, message: "clue text required" });
      }
    }
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
