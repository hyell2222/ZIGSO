import type { ActivityPack } from "@/lib/activity-pack/types";
import { formatRoleCodenames } from "@/lib/play/role-codenames";

/** 배정 역할(들) → 역할 코드명 (복수면 쉼표로 연결) */
export function formatAssignedRoleLabels(
  pack: ActivityPack,
  roleIds: string[],
  scopeKey: string,
): string | null {
  const roleIdsInPack = pack.roles.map((r) => r.id);
  return formatRoleCodenames(roleIds, scopeKey, roleIdsInPack);
}
