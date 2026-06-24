import type { ActivityPack } from "@/lib/activity-pack/types";

/**
 * 역할 표시용 라벨 — 정답 노출 방지를 위해 역할은 알파벳(A, B, C…)으로 표시한다.
 * pack.roles 순서를 기준으로 안정적으로 매핑된다.
 */

/** 인덱스 → 알파벳 라벨 (A, B, … Z, AA, AB …) */
export function letterLabel(index: number): string {
  const A = "A".charCodeAt(0);
  if (index < 26) return String.fromCharCode(A + index);
  const first = Math.floor(index / 26) - 1;
  const second = index % 26;
  return `${String.fromCharCode(A + first)}${String.fromCharCode(A + second)}`;
}

/** 활동 범위(scope) 안에서 roleId → 알파벳 라벨 (순서 기준) */
export function buildRoleCodenameMap(_scopeKey: string, roleIds: string[]): Map<string, string> {
  const unique = [...new Set(roleIds.filter(Boolean))];
  const map = new Map<string, string>();
  unique.forEach((id, index) => {
    map.set(id, letterLabel(index));
  });
  return map;
}

export function codenameForRole(
  scopeKey: string,
  roleId: string,
  roleIdsInPack: string[],
): string {
  return buildRoleCodenameMap(scopeKey, roleIdsInPack).get(roleId) ?? roleId;
}

/** 배정 역할 여러 개 → 알파벳 라벨을 쉼표로 연결 */
export function formatRoleCodenames(
  roleIds: string[],
  scopeKey: string,
  roleIdsInPack: string[],
): string | null {
  const unique = [...new Set(roleIds.filter(Boolean))];
  if (unique.length === 0) return null;
  const map = buildRoleCodenameMap(scopeKey, roleIdsInPack);
  const labels = unique.map((id) => map.get(id)).filter((name): name is string => Boolean(name));
  return labels.length ? labels.join(", ") : null;
}

/** 배정 역할(들) → 역할 코드명 (복수면 쉼표로 연결) */
export function formatAssignedRoleLabels(
  pack: ActivityPack,
  roleIds: string[],
  scopeKey: string,
): string | null {
  const roleIdsInPack = pack.roles.map((r) => r.id);
  return formatRoleCodenames(roleIds, scopeKey, roleIdsInPack);
}
