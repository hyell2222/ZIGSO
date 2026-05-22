import type { ActivityPack, Item, Role } from "@/lib/activity-pack/types";
import { formatRoleCodenames } from "@/lib/play/role-codenames";

/** 역할당 아이템 수 상한 */
export const MAX_ITEMS_PER_ROLE = 8;

export const MIN_ITEMS_PER_ROLE = 1;

/** 역할 배열 → 전체 아이템 목록 (중복 id 없음) */
export function flattenRoleItems(roles: Role[]): Item[] {
  const items: Item[] = [];
  const seen = new Set<string>();
  for (const role of roles) {
    for (const item of role.items) {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        items.push(item);
      }
    }
  }
  return items;
}

/** 레거시 flat items → 역할당 1아이템 구조 */
export function itemsToRoles(items: Item[]): Role[] {
  return items.map((item) => ({
    id: item.id,
    name: item.name,
    items: [item],
  }));
}

export function ensurePackRoles(pack: ActivityPack): ActivityPack {
  const roles =
    pack.roles.length > 0 ? pack.roles : itemsToRoles(pack.items);
  const items = flattenRoleItems(roles);
  return { ...pack, roles, items };
}

export function getRoleById(pack: ActivityPack, roleId: string): Role | undefined {
  return pack.roles.find((r) => r.id === roleId);
}

export function roleIdForItemId(pack: ActivityPack, itemId: string): string | undefined {
  return pack.roles.find((r) => r.items.some((i) => i.id === itemId))?.id;
}

/** 아이템 id 목록 → 역할 id (중복 제거, pack.roles 순서 유지) */
export function roleIdsForItemIds(pack: ActivityPack, itemIds: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const itemId of itemIds) {
    const roleId = roleIdForItemId(pack, itemId);
    if (roleId && !seen.has(roleId)) {
      seen.add(roleId);
      result.push(roleId);
    }
  }
  return result;
}

/** 배정 아이템 → 역할 코드명 (복수 역할이면 쉼표로 연결) */
export function formatAssignedRoleLabels(
  pack: ActivityPack,
  itemIds: string[],
  scopeKey: string,
): string | null {
  const roleIdsInPack = pack.roles.map((r) => r.id);
  return formatRoleCodenames(roleIdsForItemIds(pack, itemIds), scopeKey, roleIdsInPack);
}

export function maxItemsPerRole(roles: Role[]): number {
  if (roles.length === 0) return 1;
  return Math.max(1, ...roles.map((r) => r.items.length));
}
