import { PLAYER_MESSAGES } from "@/lib/activity-pack/player-messages";
import { itemsToRoles, flattenRoleItems } from "@/lib/activity-pack/roles";
import { normalizePackSizing } from "@/lib/activity-pack/sizing";
import { validateActivityPack } from "@/lib/activity-pack/validate";
import type { ActivityPack, Item, ItemClues, Role, Task } from "@/lib/activity-pack/types";
import { ACTIVITY_PACK_VERSION } from "@/lib/activity-pack/types";

const CLUE_KEYS = ["stage1", "stage2", "stage3", "stage4", "stage5"] as const;

/** JSON(unknown) → ActivityPack. 형식이 맞지 않으면 null */
export function parseActivityPack(raw: unknown): ActivityPack | null {
  if (!raw || typeof raw !== "object") return null;
  const p = raw as Record<string, unknown>;

  if (p.version !== ACTIVITY_PACK_VERSION) return null;
  if (!Array.isArray(p.tasks) || p.tasks.length === 0) return null;

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
  const tasks = (p.tasks as unknown[]).map((entry, idx) => readTask(entry, idx, itemLookup));

  const pack = normalizePackSizing({
    version: ACTIVITY_PACK_VERSION,
    title: String(p.title ?? "").trim(),
    description: String(p.description ?? "").trim(),
    groupSize: roles.length,
    itemsPerPlayer: 1,
    roles,
    items,
    tasks,
  });

  return validateActivityPack(pack).length === 0 ? pack : null;
}

/** parse + 검증 실패 시 throw (AI 생성·저장 등) */
export function loadActivityPack(raw: unknown): ActivityPack {
  const pack = parseActivityPack(raw);
  if (!pack) {
    throw new Error("활동 팩을 읽을 수 없습니다.");
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

function readTask(
  raw: unknown,
  idx: number,
  lookup: ReturnType<typeof buildItemLookup>,
): Task {
  const t = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const acceptedItemIds = resolveAcceptedItemIds(
    Array.isArray(t.acceptedItemIds) ? t.acceptedItemIds : [],
    lookup,
  );

  return {
    id: String(t.id ?? `task_${idx + 1}`),
    title: String(t.title ?? "").trim(),
    description: String(t.description ?? "").trim(),
    acceptedItemIds,
  };
}

function resolveAcceptedItemIds(raw: unknown[], lookup: ReturnType<typeof buildItemLookup>): string[] {
  const resolved: string[] = [];
  for (const entry of raw) {
    const value = String(entry).trim();
    if (!value) continue;
    if (lookup.byId.has(value)) {
      resolved.push(value);
      continue;
    }
    const byName = lookup.byName.get(value.toLowerCase());
    if (byName) resolved.push(byName);
  }
  return [...new Set(resolved)];
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
