import { gradeTest } from "@/lib/activity-pack/engine";
import { formatAssignedRoleLabels } from "@/lib/activity-pack/roles";
import { stadImprovementPoints, testPercent } from "@/lib/activity-pack/scoring";
import type { ActivityPack, QuizAnswer } from "@/lib/activity-pack/types";

export type ResultsGroupInput = {
  id: string;
  name: string | null;
};

export type ResultsMemberInput = {
  id: string;
  nickname: string | null;
  groupId: string;
  assignedRoleId: string | null;
  /** 전문가 연습으로 정해진 기준 점수 (0~100) */
  baseScore?: number | null;
  /** 개별 형성평가(실전 문제) 응답 */
  individual_quiz_answers?: QuizAnswer[];
  /** 개별 형성평가 제출 시각 */
  individual_quiz_submitted_at?: string | null;
};

export type MemberResult = {
  playerId: string;
  nickname: string;
  assignedRoleId: string | null;
  roleLabel: string;
  /** 기준 점수 (전문가 연습) */
  baseScore: number;
  /** 실전 점수 (형성평가 정답률 %) */
  testScore: number;
  testCorrect: number;
  testTotal: number;
  /** 개인 점수 = STAD 향상 점수 (0~30) */
  improvementPoints: number;
  /** 형성평가 제출 여부 */
  submitted: boolean;
};

export type TeamMvpResult = {
  playerId: string;
  nickname: string;
  roleLabel: string;
  improvementPoints: number;
  testScore: number;
};

export type RankedTeamResult = {
  rank: number;
  groupId: string;
  groupName: string;
  /** 집단 점수 = 모둠원 개인 점수(향상 점수)의 평균 */
  teamScore: number;
  memberCount: number;
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
  /** 집단 점수 (평균 향상 점수) */
  teamScore: number;
  teamRank: number;
  totalTeams: number;
  /** 기준 점수 */
  baseScore: number;
  /** 실전 점수 (%) */
  testScore: number;
  testCorrect: number;
  testTotal: number;
  /** 개인 점수 (향상 점수) */
  improvementPoints: number;
  submitted: boolean;
  personalRank: number;
  totalPlayers: number;
  roleLabel: string;
};

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((s, v) => s + v, 0) / values.length);
}

function assignMemberRanks(members: MemberResult[]): RankedMemberResult[] {
  const sorted = [...members].sort((a, b) => {
    if (b.improvementPoints !== a.improvementPoints) return b.improvementPoints - a.improvementPoints;
    return b.testScore - a.testScore;
  });

  let rank = 0;
  let prevScore: number | null = null;
  return sorted.map((member, index) => {
    if (prevScore === null || member.improvementPoints < prevScore) {
      rank = index + 1;
      prevScore = member.improvementPoints;
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
    teamScore: myTeam.teamScore,
    teamRank: myTeam.rank,
    totalTeams: summary.rankedTeams.length,
    baseScore: myMember.baseScore,
    testScore: myMember.testScore,
    testCorrect: myMember.testCorrect,
    testTotal: myMember.testTotal,
    improvementPoints: myMember.improvementPoints,
    submitted: myMember.submitted,
    personalRank: myRank,
    totalPlayers: allPlayers.length,
    roleLabel: myMember.roleLabel,
  };
}

function roleLabelFor(
  pack: ActivityPack,
  roleId: string | null,
  roleScopeKey?: string,
): string {
  if (!roleId) return "—";
  if (roleScopeKey) {
    return (
      formatAssignedRoleLabels(pack, [roleId], roleScopeKey) ??
      pack.roles.find((r) => r.id === roleId)?.name ??
      roleId
    );
  }
  return pack.roles.find((r) => r.id === roleId)?.name ?? roleId;
}

function computeMemberResults(
  pack: ActivityPack,
  members: ResultsMemberInput[],
  roleScopeKey?: string,
): MemberResult[] {
  const testTotal = pack.roles.length;
  return members.map((m) => {
    const roleLabel = roleLabelFor(pack, m.assignedRoleId, roleScopeKey);
    const grade = gradeTest(pack, m.individual_quiz_answers ?? []);
    const submitted = Boolean(m.individual_quiz_submitted_at);
    const baseScore = Math.max(0, Math.round(m.baseScore ?? 0));
    const testScore = testPercent(grade.correctCount, testTotal);
    const improvementPoints = submitted ? stadImprovementPoints(baseScore, testScore) : 0;
    return {
      playerId: m.id,
      nickname: m.nickname?.trim() || "참가자",
      assignedRoleId: m.assignedRoleId,
      roleLabel,
      baseScore,
      testScore,
      testCorrect: grade.correctCount,
      testTotal,
      improvementPoints,
      submitted,
    };
  });
}

function pickMvp(members: MemberResult[]): TeamMvpResult {
  if (members.length === 0) {
    return { playerId: "", nickname: "—", roleLabel: "—", improvementPoints: 0, testScore: 0 };
  }
  const best = members.reduce((a, b) => {
    if (b.improvementPoints !== a.improvementPoints) {
      return b.improvementPoints > a.improvementPoints ? b : a;
    }
    if (b.testScore !== a.testScore) return b.testScore > a.testScore ? b : a;
    return a;
  });
  return {
    playerId: best.playerId,
    nickname: best.nickname,
    roleLabel: best.roleLabel,
    improvementPoints: best.improvementPoints,
    testScore: best.testScore,
  };
}

function assignRanks(teams: Omit<RankedTeamResult, "rank">[]): RankedTeamResult[] {
  const sorted = [...teams].sort((a, b) => {
    if (b.teamScore !== a.teamScore) return b.teamScore - a.teamScore;
    const aTest = a.members.reduce((s, m) => s + m.testScore, 0);
    const bTest = b.members.reduce((s, m) => s + m.testScore, 0);
    return bTest - aTest;
  });

  let rank = 0;
  let prevScore: number | null = null;
  return sorted.map((team, index) => {
    if (prevScore === null || team.teamScore < prevScore) {
      rank = index + 1;
      prevScore = team.teamScore;
    }
    return { ...team, rank };
  });
}

export function buildSessionResults(
  pack: ActivityPack,
  groups: ResultsGroupInput[],
  members: ResultsMemberInput[],
  roleScopeKey?: string,
): SessionResultsSummary {
  const byGroup = new Map<string, ResultsMemberInput[]>();
  for (const m of members) {
    const list = byGroup.get(m.groupId) ?? [];
    list.push(m);
    byGroup.set(m.groupId, list);
  }

  const teams = groups.map((group) => {
    const groupMembers = byGroup.get(group.id) ?? [];
    const memberResults = computeMemberResults(pack, groupMembers, roleScopeKey);
    const teamScore = average(memberResults.map((m) => m.improvementPoints));
    const mvp = pickMvp(memberResults);
    return {
      groupId: group.id,
      groupName: group.name?.trim() || "모둠",
      teamScore,
      memberCount: memberResults.length,
      mvp,
      members: memberResults.sort((a, b) => b.improvementPoints - a.improvementPoints),
    };
  });

  return { rankedTeams: assignRanks(teams) };
}
