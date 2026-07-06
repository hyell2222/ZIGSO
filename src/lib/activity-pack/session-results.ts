import { formatGroupDisplayName, gradeTest } from "@/lib/activity-pack/engine";
import { formatAssignedRoleLabels, letterLabel } from "@/lib/play/role-codenames";
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
  home_group_completed_at?: string | null;
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
  submittedAt?: number;
  durationText?: string;
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
  completedAt?: number;
  durationText?: string;
};

export type SessionResultsSummary = {
  rankedTeams: RankedTeamResult[];
  rankedMembers: RankedMemberResult[];
  totalTeams: number;
  totalPlayers: number;
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
  durationText?: string;
  teamDurationText?: string;
};

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((s, v) => s + v, 0) / values.length);
}

function assignMemberRanks(members: MemberResult[]): RankedMemberResult[] {
  const sorted = [...members].sort((a, b) => {
    if (b.improvementPoints !== a.improvementPoints) return b.improvementPoints - a.improvementPoints;

    const aTime = a.submittedAt ?? Infinity;
    const bTime = b.submittedAt ?? Infinity;
    if (aTime !== bTime) return aTime - bTime;

    return b.testScore - a.testScore;
  });

  return sorted.map((member, index) => {
    return { ...member, rank: index + 1 };
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
    totalTeams: summary.totalTeams,
    baseScore: myMember.baseScore,
    testScore: myMember.testScore,
    testCorrect: myMember.testCorrect,
    testTotal: myMember.testTotal,
    improvementPoints: myMember.improvementPoints,
    submitted: myMember.submitted,
    personalRank: myRank,
    totalPlayers: summary.totalPlayers,
    roleLabel: myMember.roleLabel,
    durationText: myMember.durationText,
    teamDurationText: myTeam.durationText,
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
      getFallbackRoleLabel(pack, roleId)
    );
  }
  return getFallbackRoleLabel(pack, roleId);
}

function getFallbackRoleLabel(pack: ActivityPack, roleId: string): string {
  const index = pack.roles.findIndex((r) => r.id === roleId);
  return index !== -1 ? letterLabel(index) : roleId;
}

function computeMemberResults(
  pack: ActivityPack,
  members: ResultsMemberInput[],
  sessionStartTimeFallback: number | null,
  roleScopeKey?: string,
): MemberResult[] {
  const testTotal = pack.roles.length;

  const validBaseScores = members
    .map((m) => m.baseScore)
    .filter((score): score is number => score !== null && score !== undefined);

  const classAverageBaseScore =
    validBaseScores.length > 0
      ? Math.round(validBaseScores.reduce((sum, val) => sum + val, 0) / validBaseScores.length)
      : 0;

  const groupMembersWithHomeGroup = members
    .map((m) => m.home_group_completed_at)
    .filter((time): time is string => Boolean(time));

  const groupStartTime = groupMembersWithHomeGroup.length > 0
    ? Math.min(...groupMembersWithHomeGroup.map((time) => new Date(time).getTime()))
    : null;

  const resolvedGroupStartTime = groupStartTime || sessionStartTimeFallback;

  return members.map((m) => {
    const roleLabel = roleLabelFor(pack, m.assignedRoleId, roleScopeKey);
    const grade = gradeTest(pack, m.individual_quiz_answers ?? []);
    const submitted = Boolean(m.individual_quiz_submitted_at);
    const rawBaseScore = m.baseScore !== null && m.baseScore !== undefined ? m.baseScore : classAverageBaseScore;
    const baseScore = Math.max(0, Math.round(rawBaseScore));
    const testScore = testPercent(grade.correctCount, testTotal);
    const improvementPoints = submitted ? stadImprovementPoints(baseScore, testScore) : 0;

    const submittedAt = m.individual_quiz_submitted_at
      ? new Date(m.individual_quiz_submitted_at).getTime()
      : undefined;

    let durationText: string | undefined = undefined;
    if (m.individual_quiz_submitted_at) {
      const start = m.home_group_completed_at
        ? new Date(m.home_group_completed_at).getTime()
        : resolvedGroupStartTime;

      if (start) {
        const end = new Date(m.individual_quiz_submitted_at).getTime();
        const diff = end - start;
        if (diff >= 0) {
          const totalSec = Math.floor(diff / 1000);
          const min = Math.floor(totalSec / 60);
          const sec = totalSec % 60;
          durationText = min > 0 ? `${min}:${sec < 10 ? "0" + sec : sec}` : `0:${sec < 10 ? "0" + sec : sec}`;
        }
      }
    }

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
      submittedAt,
      durationText,
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

    const aTime = a.completedAt ?? Infinity;
    const bTime = b.completedAt ?? Infinity;
    if (aTime !== bTime) return aTime - bTime;

    const aTest = a.members.reduce((s, m) => s + m.testScore, 0);
    const bTest = b.members.reduce((s, m) => s + m.testScore, 0);
    return bTest - aTest;
  });

  return sorted.map((team, index) => {
    return { ...team, rank: index + 1 };
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

  // Calculate fallback session-wide start time
  const allMembersWithHomeGroup = members
    .map((m) => m.home_group_completed_at)
    .filter((time): time is string => Boolean(time));

  const sessionStartTime = allMembersWithHomeGroup.length > 0
    ? Math.min(...allMembersWithHomeGroup.map((time) => new Date(time).getTime()))
    : null;

  const allQuizSubmissions = members
    .map((m) => m.individual_quiz_submitted_at)
    .filter((time): time is string => Boolean(time));

  const earliestQuizSubmission = allQuizSubmissions.length > 0
    ? Math.min(...allQuizSubmissions.map((time) => new Date(time).getTime()))
    : null;

  const sessionStartTimeFallback = sessionStartTime || (earliestQuizSubmission ? earliestQuizSubmission - 2 * 60 * 1000 : null);

  const teams = groups.map((group) => {
    const groupMembers = byGroup.get(group.id) ?? [];
    const memberResults = computeMemberResults(pack, groupMembers, sessionStartTimeFallback, roleScopeKey);
    const teamScore = average(memberResults.map((m) => m.improvementPoints));
    const mvp = pickMvp(memberResults);

    const submittedMembers = groupMembers.filter((m) => m.individual_quiz_submitted_at);
    const hasSubmissions = submittedMembers.length > 0;
    const completedAt = hasSubmissions
      ? Math.max(...submittedMembers.map((m) => new Date(m.individual_quiz_submitted_at!).getTime()))
      : Infinity;

    const groupMembersWithHomeGroup = groupMembers
      .map((m) => m.home_group_completed_at)
      .filter((time): time is string => Boolean(time));

    const groupStartTime = groupMembersWithHomeGroup.length > 0
      ? Math.min(...groupMembersWithHomeGroup.map((time) => new Date(time).getTime()))
      : null;

    const resolvedGroupStartTime = groupStartTime || sessionStartTimeFallback;

    let durationText: string | undefined = undefined;
    if (hasSubmissions && resolvedGroupStartTime) {
      const diff = completedAt - resolvedGroupStartTime;
      if (diff >= 0 && diff !== Infinity) {
        const totalSec = Math.floor(diff / 1000);
        const min = Math.floor(totalSec / 60);
        const sec = totalSec % 60;
        durationText = min > 0 ? `${min}:${sec < 10 ? "0" + sec : sec}` : `0:${sec < 10 ? "0" + sec : sec}`;
      }
    }

    return {
      groupId: group.id,
      groupName: formatGroupDisplayName(group.name),
      teamScore,
      memberCount: memberResults.length,
      mvp,
      members: memberResults.sort((a, b) => b.improvementPoints - a.improvementPoints),
      completedAt,
      durationText,
    };
  });

  const rankedTeams = assignRanks(teams);
  const allMembers = rankedTeams.flatMap((t) => t.members);
  const rankedMembers = assignMemberRanks(allMembers);

  return {
    rankedTeams,
    rankedMembers,
    totalTeams: rankedTeams.length,
    totalPlayers: allMembers.length,
  };
}
