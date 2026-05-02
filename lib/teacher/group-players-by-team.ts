import { clubRoleSortKey } from "@/lib/club-role";
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
        const ra = clubRoleSortKey(a.club_role);
        const rb = clubRoleSortKey(b.club_role);
        if (ra !== rb) return ra - rb;
        return (a.investigation_zone?.name ?? "").localeCompare(b.investigation_zone?.name ?? "", "ko");
      }),
    }));
}
