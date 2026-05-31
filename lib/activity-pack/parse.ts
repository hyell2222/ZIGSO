import { PLAYER_MESSAGES } from "@/lib/activity-pack/engine";
import { itemsToRoles, flattenRoleItems } from "@/lib/activity-pack/roles";
import { normalizePackSizing } from "@/lib/activity-pack/sizing";
import { validateActivityPack } from "@/lib/activity-pack/validate";
import {
  buildDefaultHomeWorksheet,
  syncWorksheetSlotsFromPassage,
} from "@/lib/activity-pack/worksheet";
import type {
  ActivityPack,
  HomeWorksheet,
  Item,
  ItemClues,
  Role,
  WorksheetSlot,
} from "@/lib/activity-pack/types";
import { ACTIVITY_PACK_VERSION } from "@/lib/activity-pack/types";

const CLUE_KEYS = ["stage1", "stage2", "stage3", "stage4", "stage5"] as const;
const LEGACY_VERSION = 2;

/** JSON(unknown) → ActivityPack. 형식이 맞지 않으면 null */
export function parseActivityPack(raw: unknown): ActivityPack | null {
  if (!raw || typeof raw !== "object") return null;
  const p = raw as Record<string, unknown>;

  const version = p.version;
  if (version !== ACTIVITY_PACK_VERSION && version !== LEGACY_VERSION) return null;

  const seenItemIds = new Set<string>();
  let roles: Role[];
  if (Array.isArray(p.roles) && p.roles.length > 0) {
    roles = (p.roles as unknown[]).map((entry, idx) => readRole(entry, idx, seenItemIds));
  } else if (Array.isArray(p.items) && p.items.length > 0) {
    const items = (p.items as unknown[]).map((entry, idx) =>
      readItem(entry, idx, undefined, seenItemIds),
    );
    roles = itemsToRoles(items);
  } else {
    return null;
  }

  const items = flattenRoleItems(roles);
  if (items.length === 0) return null;

  const itemLookup = buildItemLookup(items);

  let homeWorksheet: HomeWorksheet;
  if (p.homeWorksheet && typeof p.homeWorksheet === "object") {
    homeWorksheet = readHomeWorksheet(p.homeWorksheet, itemLookup, roles);
  } else {
    homeWorksheet = buildDefaultHomeWorksheet(roles, items);
  }
  homeWorksheet = syncWorksheetSlotsFromPassage(homeWorksheet, roles);

  const pack = normalizePackSizing({
    version: ACTIVITY_PACK_VERSION,
    title: String(p.title ?? "").trim(),
    description: String(p.description ?? "").trim(),
    groupSize: roles.length,
    itemsPerPlayer: 1,
    roles,
    items,
    homeWorksheet,
  });

  return validateActivityPack(pack).length === 0 ? pack : null;
}

/** parse + 검증 실패 시 throw (AI 생성·저장 등) */
export function loadActivityPack(raw: unknown): ActivityPack {
  const pack = parseActivityPack(raw);
  if (!pack) {
    throw new Error("활동 콘텐츠를 읽을 수 없습니다.");
  }

  if (!pack.title.trim()) {
    pack.title = PLAYER_MESSAGES.defaultPackTitle;
  }

  return normalizePackSizing(pack);
}

export function isValidActivityPack(pack: unknown): pack is ActivityPack {
  return parseActivityPack(pack) !== null;
}

function buildItemLookup(items: Item[]) {
  const byId = new Set(items.map((item) => item.id));
  const byName = new Map<string, string>();
  for (const item of items) {
    byName.set(item.name.trim().toLowerCase(), item.id);
    byName.set(item.id.replace(/_/g, " ").trim().toLowerCase(), item.id);
  }
  return { byId, byName };
}

function readHomeWorksheet(
  raw: unknown,
  lookup: ReturnType<typeof buildItemLookup>,
  roles: Role[],
): HomeWorksheet {
  const w = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const roleIds = new Set(roles.map((r) => r.id));
  const slotsRaw = Array.isArray(w.slots) ? w.slots : [];
  const slots: WorksheetSlot[] = slotsRaw.map((entry, idx) => {
    const s = (entry && typeof entry === "object" ? entry : {}) as Record<string, unknown>;
    const itemId = resolveItemId(String(s.itemId ?? ""), lookup);
    const ownerRoleId = String(s.ownerRoleId ?? roles[idx]?.id ?? roles[0]!.id);
    const id = String(s.id ?? (itemId ? `slot_${itemId}` : `slot_${idx + 1}`));
    return {
      id,
      itemId: itemId || roles[0]!.items[0]!.id,
      ownerRoleId: roleIds.has(ownerRoleId) ? ownerRoleId : roles[0]!.id,
    };
  });

  return {
    summaryPassage: String(w.summaryPassage ?? "").trim(),
    slots: slots.length > 0 ? slots : buildDefaultHomeWorksheet(roles, flattenRoleItems(roles)).slots,
  };
}

function readRole(raw: unknown, idx: number, seenItemIds: Set<string>): Role {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const roleId = String(r.id ?? `role_${idx + 1}`);
  const name = String(r.name ?? "").trim();
  const itemEntries = Array.isArray(r.items) ? r.items : [];
  const items =
    itemEntries.length > 0
      ? itemEntries.map((entry, i) => readItem(entry, i, roleId, seenItemIds))
      : [readItem({ id: `${roleId}_item_1`, name }, 0, roleId, seenItemIds)];
  return { id: roleId, name: name || items[0]!.name, items };
}

function resolveItemId(value: string, lookup: ReturnType<typeof buildItemLookup>): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (lookup.byId.has(trimmed)) return trimmed;
  return lookup.byName.get(trimmed.toLowerCase()) ?? trimmed;
}

function readItem(
  raw: unknown,
  idx: number,
  roleIdPrefix: string | undefined,
  seenItemIds: Set<string>,
): Item {
  const i = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const cluesRaw = (i.clues ?? {}) as Record<string, unknown>;
  const defaultId = roleIdPrefix ? `${roleIdPrefix}_item_${idx + 1}` : `item_${idx + 1}`;
  const id = ensureUniqueItemId(String(i.id ?? defaultId), roleIdPrefix ?? "item", seenItemIds);

  return {
    id,
    name: String(i.name ?? "").trim(),
    clues: readClues(cluesRaw),
    aliases: Array.isArray(i.aliases)
      ? i.aliases.map((a) => String(a).trim().toLowerCase()).filter(Boolean)
      : undefined,
  };
}

function ensureUniqueItemId(id: string, prefix: string, seenItemIds: Set<string>): string {
  if (!seenItemIds.has(id)) {
    seenItemIds.add(id);
    return id;
  }

  let candidate = `${prefix}_${id}`;
  let suffix = 2;
  while (seenItemIds.has(candidate)) {
    candidate = `${prefix}_${id}_${suffix}`;
    suffix += 1;
  }
  seenItemIds.add(candidate);
  return candidate;
}

function readClues(cluesRaw: Record<string, unknown>): ItemClues {
  const clues = {} as ItemClues;
  for (const key of CLUE_KEYS) {
    clues[key] = String(cluesRaw[key] ?? "").trim();
  }

  let fallback = "";
  for (let i = CLUE_KEYS.length - 1; i >= 0; i -= 1) {
    const key = CLUE_KEYS[i]!;
    if (clues[key]) {
      fallback = clues[key];
      break;
    }
  }

  for (const key of CLUE_KEYS) {
    if (!clues[key]) clues[key] = fallback || "단서";
  }

  return clues;
}
