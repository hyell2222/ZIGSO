import type { PlayerSelfRow } from "@/lib/api/play";

export type HomeGroupMemberView = Pick<
  PlayerSelfRow,
  "id" | "nickname" | "assigned_role_id" | "created_at"
>;

/**
 * 3단계 모둠원 칩 — 교사 배정 화면과 동일하게 접속 중인 학생 우선.
 * 같은 닉네임 중복 행(재참가)은 현재 플레이어 한 명만 남긴다.
 */
export function resolveHomeGroupMembers(
  rows: PlayerSelfRow[],
  currentPlayerId: string | null,
): HomeGroupMemberView[] {
  const withRole = rows.filter((m) => Boolean(m.assigned_role_id));
  const online = withRole.filter((m) => m.is_online === true);
  const pool = online.length > 0 ? online : withRole;

  const byNickname = new Map<string, PlayerSelfRow>();
  for (const m of pool) {
    const key = (m.nickname ?? "").trim().toLowerCase() || m.id;
    const existing = byNickname.get(key);
    if (!existing) {
      byNickname.set(key, m);
      continue;
    }
    if (m.id === currentPlayerId) {
      byNickname.set(key, m);
    }
  }

  return [...byNickname.values()]
    .sort((a, b) => {
      const ta = Date.parse(a.created_at);
      const tb = Date.parse(b.created_at);
      const na = Number.isNaN(ta) ? 0 : ta;
      const nb = Number.isNaN(tb) ? 0 : tb;
      if (na !== nb) return na - nb;
      return (a.nickname ?? "").localeCompare(b.nickname ?? "", "ko");
    })
    .map((m) => ({
      id: m.id,
      nickname: m.nickname,
      assigned_role_id: m.assigned_role_id,
      created_at: m.created_at,
    }));
}
