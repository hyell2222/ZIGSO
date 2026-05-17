/**
 * 배정 역할 표시용 코드명 — 정답(항목 이름) 대신 사용.
 * scopeKey(세션 id 등)로 시드를 고정해 같은 활동 안에서는 항목마다 항상 같은 이름.
 */

export const ROLE_CODENAME_POOL = [
  "코알라",
  "복숭아",
  "오로라",
  "감자칩",
  "북극성",
  "토스트",
  "돌고래",
  "민트",
  "번개",
  "단풍",
  "구름",
  "별똥별",
  "바다거북",
  "솔방울",
  "무지개",
  "펭귄",
  "호두",
  "은하",
  "바나나",
  "파도",
  "달빛",
  "수박",
  "여우",
  "자두",
  "모험",
  "연필",
  "풍선",
  "사슴",
] as const;

function hashScope(scopeKey: string): number {
  let h = 0;
  for (let i = 0; i < scopeKey.length; i++) {
    h = (h * 31 + scopeKey.charCodeAt(i)) >>> 0;
  }
  return h;
}

function seededShuffle<T>(items: readonly T[], seed: number): T[] {
  const arr = [...items];
  let s = seed || 1;
  for (let i = arr.length - 1; i > 0; i--) {
    s = (s * 1_103_515_245 + 12_345) >>> 0;
    const j = s % (i + 1);
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}

/** 활동 범위(scope) 안에서 roleId → 코드명 (플레이·편집기 공통) */
export function buildRoleCodenameMap(scopeKey: string, roleIds: string[]): Map<string, string> {
  return buildItemCodenameMap(scopeKey, roleIds);
}

export function codenameForRole(
  scopeKey: string,
  roleId: string,
  roleIdsInPack: string[],
): string {
  return codenameForItem(scopeKey, roleId, roleIdsInPack);
}

/** 활동 범위(scope) 안에서 itemId → 코드명 */
export function buildItemCodenameMap(scopeKey: string, itemIds: string[]): Map<string, string> {
  const unique = [...new Set(itemIds.filter(Boolean))];
  const map = new Map<string, string>();
  if (unique.length === 0) return map;

  const names = seededShuffle(ROLE_CODENAME_POOL, hashScope(scopeKey));
  unique.forEach((id, index) => {
    map.set(id, names[index % names.length]!);
  });
  return map;
}

export function codenameForItem(
  scopeKey: string,
  itemId: string,
  itemIdsInPack: string[],
): string {
  return buildItemCodenameMap(scopeKey, itemIdsInPack).get(itemId) ?? itemId;
}

export function formatItemCodenames(itemIds: string[], map: Map<string, string>): string | null {
  const labels = itemIds.map((id) => map.get(id)).filter((name): name is string => Boolean(name));
  if (labels.length === 0) return null;
  return labels.join(", ");
}
