import type { ActivityPack } from "@/lib/activity-pack/types";
import { codenameForRole } from "@/lib/play/role-codenames";

/** 모둠당 역할 수 하한·상한 */
export const MIN_ROLES_PER_GROUP = 2;
export const MAX_ROLES_PER_GROUP = 12;

/**
 * 모둠 인원 = 역할 수.
 * 역할 표시명은 코드명으로 고정(정답 노출 방지).
 */
export function normalizePackSizing(pack: ActivityPack): ActivityPack {
  const roleCount = pack.roles.length;
  const groupSize = Math.min(MAX_ROLES_PER_GROUP, Math.max(MIN_ROLES_PER_GROUP, roleCount));
  const scopeKey = pack.title.trim() || "activity";
  const roleIds = pack.roles.map((r) => r.id);
  const roles = pack.roles.map((role) => ({
    ...role,
    name: codenameForRole(scopeKey, role.id, roleIds),
  }));
  return {
    ...pack,
    roles,
    groupSize,
  };
}
