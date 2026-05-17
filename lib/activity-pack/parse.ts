import { PLAYER_MESSAGES } from "@/lib/activity-pack/player-messages";
import { itemsToRoles, flattenRoleItems } from "@/lib/activity-pack/roles";
import { normalizePackSizing } from "@/lib/activity-pack/sizing";
import { validateActivityPack } from "@/lib/activity-pack/validate";
import type { ActivityPack, Item, Role, Task } from "@/lib/activity-pack/types";
import { ACTIVITY_PACK_VERSION } from "@/lib/activity-pack/types";

/** JSON(unknown) → ActivityPack. 형식이 맞지 않으면 null */
export function parseActivityPack(raw: unknown): ActivityPack | null {
  if (!raw || typeof raw !== "object") return null;
  const p = raw as Record<string, unknown>;

  if (p.version !== ACTIVITY_PACK_VERSION) return null;
  if (!Array.isArray(p.tasks) || p.tasks.length === 0) return null;

  let roles: Role[];
  if (Array.isArray(p.roles) && p.roles.length > 0) {
    roles = (p.roles as unknown[]).map((entry, idx) => readRole(entry, idx));
  } else if (Array.isArray(p.items) && p.items.length > 0) {
    const items = (p.items as unknown[]).map((entry, idx) => readItem(entry, idx));
    roles = itemsToRoles(items);
  } else {
    return null;
  }

  const items = flattenRoleItems(roles);
  if (items.length === 0) return null;

  const itemIds = new Set(items.map((i) => i.id));
  const tasks = (p.tasks as unknown[]).map((entry, idx) => readTask(entry, idx, itemIds));

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

function readRole(raw: unknown, idx: number): Role {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const roleId = String(r.id ?? `role_${idx + 1}`);
  const name = String(r.name ?? "").trim();
  const itemEntries = Array.isArray(r.items) ? r.items : [];
  const items =
    itemEntries.length > 0
      ? itemEntries.map((entry, i) => readItem(entry, i, roleId))
      : [readItem({ id: `${roleId}_item_1`, name }, 0, roleId)];
  return { id: roleId, name: name || items[0]!.name, items };
}

function readTask(raw: unknown, idx: number, itemIds: Set<string>): Task {
  const t = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const acceptedItemIds = (Array.isArray(t.acceptedItemIds) ? t.acceptedItemIds : [])
    .map((id) => String(id))
    .filter((id) => itemIds.has(id));

  const minRaw = t.minimumItems;
  const minimumItems =
    typeof minRaw === "number" && minRaw >= 1
      ? Math.min(minRaw, acceptedItemIds.length || minRaw)
      : undefined;

  return {
    id: String(t.id ?? `task_${idx + 1}`),
    title: String(t.title ?? "").trim(),
    description: String(t.description ?? "").trim(),
    acceptedItemIds,
    minimumItems,
  };
}

function readItem(raw: unknown, idx: number, roleIdPrefix?: string): Item {
  const i = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const hintsRaw = (i.hints ?? {}) as Record<string, unknown>;
  const defaultId = roleIdPrefix ? `${roleIdPrefix}_item_${idx + 1}` : `item_${idx + 1}`;
  return {
    id: String(i.id ?? defaultId),
    name: String(i.name ?? "").trim(),
    hints: {
      stage1: String(hintsRaw.stage1 ?? "").trim(),
      stage2: String(hintsRaw.stage2 ?? "").trim(),
      stage3: String(hintsRaw.stage3 ?? "").trim(),
      stage4: String(hintsRaw.stage4 ?? "").trim(),
      stage5: String(hintsRaw.stage5 ?? "").trim(),
    },
    aliases: Array.isArray(i.aliases)
      ? i.aliases.map((a) => String(a).trim().toLowerCase()).filter(Boolean)
      : undefined,
  };
}

