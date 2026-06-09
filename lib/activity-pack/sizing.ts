import type { ActivityPack } from "@/lib/activity-pack/types";
import { codenameForRole } from "@/lib/play/role-codenames";

/** 모둠당 역할 수 하한·상한 */
export const MIN_ROLES_PER_GROUP = 2;
export const MAX_ROLES_PER_GROUP = 12;

/**
 * 모둠 인원은 역할 수(`pack.roles.length`)와 같다 — 별도 필드로 저장하지 않는다.
 * 역할 표시명만 코드명으로 고정한다(정답 노출 방지).
 */
export function normalizePackSizing(pack: ActivityPack): ActivityPack {
  const scopeKey = pack.title.trim() || "activity";
  const roleIds = pack.roles.map((r) => r.id);
  const roles = pack.roles.map((role) => ({
    ...role,
    name: codenameForRole(scopeKey, role.id, roleIds),
  }));
  return {
    ...pack,
    roles,
  };
}
