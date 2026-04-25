/**
 * `players.club_role` (세션 호스트가 시작한 뒤 팀마다 랜덤 배정).
 */
export type ClubRole = "president" | "vice_president" | "member";

const ROLE_ORDER: ClubRole[] = ["president", "vice_president", "member"];

export function isClubRole(value: string | null | undefined): value is ClubRole {
  return value === "president" || value === "vice_president" || value === "member";
}

export function clubRoleLabelKr(role: string | null | undefined): string {
  if (role === "president") return "수석 요원(부장)";
  if (role === "vice_president") return "부수석(차장)";
  if (role === "member") return "탐정 부원";
  return "탐정 부원";
}

/** SQL ORDER BY 절에 맞는 문자열 (president → vice → member) */
export function clubRoleSortKey(role: string | null | undefined): number {
  const idx = ROLE_ORDER.indexOf(role as ClubRole);
  return idx === -1 ? 99 : idx;
}
