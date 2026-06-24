import type { SessionPlayerRow, GroupRow } from "@/lib/api/play";

export type GroupGroup = {
  group: GroupRow;
  members: SessionPlayerRow[];
};

export function groupPlayersByGroup(players: SessionPlayerRow[], groups: GroupRow[]): GroupGroup[] {
  const playersByGroupId = new Map<string, SessionPlayerRow[]>();
  for (const p of players) {
    if (!p.group_id) continue;
    const list = playersByGroupId.get(p.group_id) ?? [];
    list.push(p);
    playersByGroupId.set(p.group_id, list);
  }
  return [...groups]
    .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? "", undefined, { numeric: true }))
    .map((group) => ({
      group,
      members: (playersByGroupId.get(group.id) ?? []).sort((a, b) => {
        const ta = Date.parse(a.created_at);
        const tb = Date.parse(b.created_at);
        const na = Number.isNaN(ta) ? 0 : ta;
        const nb = Number.isNaN(tb) ? 0 : tb;
        if (na !== nb) return nb - na;
        return (a.nickname ?? "").localeCompare(b.nickname ?? "", "ko");
      }),
    }));
}
