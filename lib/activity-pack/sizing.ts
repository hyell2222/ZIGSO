import { ensurePackRoles, maxItemsPerRole } from "@/lib/activity-pack/roles";
import type { ActivityPack } from "@/lib/activity-pack/types";
import { codenameForRole } from "@/lib/play/role-codenames";

/** 모둠당 역할 수 하한·상한 */
export const MIN_ROLES_PER_GROUP = 2;
export const MAX_ROLES_PER_GROUP = 12;

/**
 * 모둠 인원 = 역할 수.
 * itemsPerPlayer = 역할당 아이템 수(최댓값).
 */
export function normalizePackSizing(pack: ActivityPack): ActivityPack {
  const withRoles = ensurePackRoles(pack);
  const roleCount = withRoles.roles.length;
  const groupSize = Math.min(MAX_ROLES_PER_GROUP, Math.max(MIN_ROLES_PER_GROUP, roleCount));
  const itemsPerPlayer = maxItemsPerRole(withRoles.roles);
  const scopeKey = withRoles.title.trim() || "activity";
  const roleIds = withRoles.roles.map((r) => r.id);
  const roles = withRoles.roles.map((role) => ({
    ...role,
    name: codenameForRole(scopeKey, role.id, roleIds),
  }));
  return {
    ...withRoles,
    roles,
    groupSize,
    itemsPerPlayer,
  };
}

export function derivedActivityScale(roleCount: number, itemsPerRole: number) {
  const groupSize = Math.min(MAX_ROLES_PER_GROUP, Math.max(MIN_ROLES_PER_GROUP, roleCount));
  return {
    roleCount,
    groupSize,
    itemsPerRole,
    itemsPerPlayer: itemsPerRole,
  };
}
