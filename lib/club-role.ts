/**
 * `players.club_role` (세션 호스트가 시작한 뒤 팀마다 랜덤 배정).
 */
export type ClubRole = "president" | "vice_president" | "member";

const ROLE_ORDER: ClubRole[] = ["president", "vice_president", "member"];

export function isClubRole(value: string | null | undefined): value is ClubRole {
  return value === "president" || value === "vice_president" || value === "member";
}

export function clubRoleLabelKr(role: string | null | undefined): string {
  if (role === "president") return "동아리 부장";
  if (role === "vice_president") return "동아리 차장";
  if (role === "member") return "동아리 부원";
  return "역할 미정";
}

/** SQL ORDER BY 절에 맞는 문자열 (president → vice → member) */
export function clubRoleSortKey(role: string | null | undefined): number {
  const idx = ROLE_ORDER.indexOf(role as ClubRole);
  return idx === -1 ? 99 : idx;
}
