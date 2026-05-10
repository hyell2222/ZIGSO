import type { SessionPlayerRow, TeamRow } from "@/lib/api/play";

export type TeamGroup = {
  team: TeamRow;
  members: SessionPlayerRow[];
};

export function groupPlayersByTeam(players: SessionPlayerRow[], teams: TeamRow[]): TeamGroup[] {
  const playersByTeamId = new Map<string, SessionPlayerRow[]>();
  for (const p of players) {
    if (!p.team_id) continue;
    const list = playersByTeamId.get(p.team_id) ?? [];
    list.push(p);
    playersByTeamId.set(p.team_id, list);
  }
  return [...teams]
    .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""))
    .map((team) => ({
      team,
      members: (playersByTeamId.get(team.id) ?? []).sort((a, b) => {
        const zcmp = (a.investigation_zone?.name ?? "").localeCompare(b.investigation_zone?.name ?? "", "ko");
        if (zcmp !== 0) return zcmp;
        const ta = Date.parse(a.created_at);
        const tb = Date.parse(b.created_at);
        const na = Number.isNaN(ta) ? 0 : ta;
        const nb = Number.isNaN(tb) ? 0 : tb;
        if (na !== nb) return nb - na;
        return (a.nickname ?? "").localeCompare(b.nickname ?? "", "ko");
      }),
    }));
}
