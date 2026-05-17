import { totalGroupScore } from "@/lib/activity-pack/engine";
import type { ActivityPack } from "@/lib/activity-pack/types";
import type { AcquiredItem, CompletedTask } from "@/lib/activity-pack/types";

export const ACTIVITY_COMPLETION_BONUS = 5;

export type ResultsGroupInput = {
  id: string;
  name: string | null;
  acquired_items: AcquiredItem[];
  completed_tasks: CompletedTask[];
  completed_at: string | null;
};

export type ResultsMemberInput = {
  id: string;
  nickname: string | null;
  groupId: string;
  assignedRoleId: string | null;
};

export type MemberResult = {
  playerId: string;
  nickname: string;
  assignedRoleId: string | null;
  roleLabel: string;
  expertScore: number;
  teamShareScore: number;
  totalScore: number;
};

export type TeamMvpResult = {
  playerId: string;
  nickname: string;
  roleLabel: string;
  totalScore: number;
  expertScore: number;
};

export type RankedTeamResult = {
  rank: number;
  groupId: string;
  groupName: string;
  totalScore: number;
  itemsAcquired: number;
  tasksCompleted: number;
  activityCompleted: boolean;
  mvp: TeamMvpResult;
  members: MemberResult[];
};

export type SessionResultsSummary = {
  rankedTeams: RankedTeamResult[];
};

export type RankedMemberResult = MemberResult & { rank: number };

export type StudentResultsSnapshot = {
  groupId: string;
  groupName: string;
  groupScore: number;
  groupRank: number;
  totalTeams: number;
  personalScore: number;
  personalRank: number;
  totalPlayers: number;
  roleLabel: string;
  expertScore: number;
  teamShareScore: number;
};

function assignMemberRanks(members: MemberResult[]): RankedMemberResult[] {
  const sorted = [...members].sort((a, b) => {
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
    return b.expertScore - a.expertScore;
  });

  let rank = 0;
  let prevScore: number | null = null;
  return sorted.map((member, index) => {
    if (prevScore === null || member.totalScore < prevScore) {
      rank = index + 1;
      prevScore = member.totalScore;
    }
    return { ...member, rank };
  });
}

export function getStudentResultsSnapshot(
  summary: SessionResultsSummary,
  groupId: string | null | undefined,
  playerId: string | null | undefined,
): StudentResultsSnapshot | null {
  if (!groupId || !playerId) return null;

  const myTeam = summary.rankedTeams.find((t) => t.groupId === groupId);
  if (!myTeam) return null;

  const myMember = myTeam.members.find((m) => m.playerId === playerId);
  if (!myMember) return null;

  const allPlayers = summary.rankedTeams.flatMap((t) => t.members);
  const rankedPlayers = assignMemberRanks(allPlayers);
  const myRank = rankedPlayers.find((m) => m.playerId === playerId)?.rank ?? 0;

  return {
    groupId: myTeam.groupId,
    groupName: myTeam.groupName,
    groupScore: myTeam.totalScore,
    groupRank: myTeam.rank,
    totalTeams: summary.rankedTeams.length,
    personalScore: myMember.totalScore,
    personalRank: myRank,
    totalPlayers: allPlayers.length,
    roleLabel: myMember.roleLabel,
    expertScore: myMember.expertScore,
    teamShareScore: myMember.teamShareScore,
  };
}

export function computeGroupTotalScore(group: ResultsGroupInput): number {
  const base = totalGroupScore(group.acquired_items, group.completed_tasks);
  return group.completed_at ? base + ACTIVITY_COMPLETION_BONUS : base;
}

function roleLabelFor(pack: ActivityPack, roleId: string | null): string {
  if (!roleId) return "—";
  return pack.items.find((i) => i.id === roleId)?.name ?? roleId;
}

function computeMemberResults(
  pack: ActivityPack,
  group: ResultsGroupInput,
  members: ResultsMemberInput[],
): MemberResult[] {
  const count = Math.max(members.length, 1);
  const taskPoints = group.completed_tasks.reduce((sum, t) => sum + t.score, 0);
  const completionBonus = group.completed_at ? ACTIVITY_COMPLETION_BONUS : 0;
  const teamShareEach = (taskPoints + completionBonus) / count;

  return members.map((m) => {
    const expertScore = group.acquired_items
      .filter((a) => a.itemId === m.assignedRoleId)
      .reduce((sum, a) => sum + a.score, 0);
    const teamShareScore = Math.round(teamShareEach * 10) / 10;
    const totalScore = Math.round((expertScore + teamShareEach) * 10) / 10;
    return {
      playerId: m.id,
      nickname: m.nickname?.trim() || "참가자",
      assignedRoleId: m.assignedRoleId,
      roleLabel: roleLabelFor(pack, m.assignedRoleId),
      expertScore,
      teamShareScore,
      totalScore,
    };
  });
}

function pickMvp(members: MemberResult[]): TeamMvpResult {
  if (members.length === 0) {
    return {
      playerId: "",
      nickname: "—",
      roleLabel: "—",
      totalScore: 0,
      expertScore: 0,
    };
  }
  const best = members.reduce((a, b) => {
    if (b.totalScore !== a.totalScore) return b.totalScore > a.totalScore ? b : a;
    if (b.expertScore !== a.expertScore) return b.expertScore > a.expertScore ? b : a;
    return a;
  });
  return {
    playerId: best.playerId,
    nickname: best.nickname,
    roleLabel: best.roleLabel,
    totalScore: best.totalScore,
    expertScore: best.expertScore,
  };
}

function assignRanks(teams: Omit<RankedTeamResult, "rank">[]): RankedTeamResult[] {
  const sorted = [...teams].sort((a, b) => {
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
    if (b.tasksCompleted !== a.tasksCompleted) return b.tasksCompleted - a.tasksCompleted;
    return b.itemsAcquired - a.itemsAcquired;
  });

  let rank = 0;
  let prevScore: number | null = null;
  return sorted.map((team, index) => {
    if (prevScore === null || team.totalScore < prevScore) {
      rank = index + 1;
      prevScore = team.totalScore;
    }
    return { ...team, rank };
  });
}

export function buildSessionResults(
  pack: ActivityPack,
  groups: ResultsGroupInput[],
  members: ResultsMemberInput[],
): SessionResultsSummary {
  const byGroup = new Map<string, ResultsMemberInput[]>();
  for (const m of members) {
    const list = byGroup.get(m.groupId) ?? [];
    list.push(m);
    byGroup.set(m.groupId, list);
  }

  const teams = groups.map((group) => {
    const groupMembers = byGroup.get(group.id) ?? [];
    const memberResults = computeMemberResults(pack, group, groupMembers);
    const mvp = pickMvp(memberResults);
    return {
      groupId: group.id,
      groupName: group.name?.trim() || "모둠",
      totalScore: computeGroupTotalScore(group),
      itemsAcquired: group.acquired_items.length,
      tasksCompleted: group.completed_tasks.length,
      activityCompleted: Boolean(group.completed_at),
      mvp,
      members: memberResults.sort((a, b) => b.totalScore - a.totalScore),
    };
  });

  return { rankedTeams: assignRanks(teams) };
}
