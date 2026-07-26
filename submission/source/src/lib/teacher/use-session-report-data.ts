"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { parseActivityPack } from "@/lib/api/activities";
import {
  getHostSessionDetails,
  listSessionGroups,
  listSessionPlayers,
  parseAssignedRoleIds,
} from "@/lib/api/play";
import { formatAssignedRoleLabels } from "@/lib/play/role-codenames";
import {
  buildSessionResults,
  getStudentResultsSnapshot,
  type SessionResultsSummary,
  type StudentResultsSnapshot,
} from "@/lib/activity-pack/session-results";
import type { GroupRow, SessionPlayerRow } from "@/lib/api/play";
import {
  GroupAssignmentGroup,
} from "@/components/teacher/group-assignment-dashboard";
import type { SessionResultsMember } from "@/components/teacher/session-results-dashboard";
import { groupPlayersByGroup } from "@/lib/teacher/group-players-by-group";
import { isPlayerPhaseComplete } from "@/lib/teacher/phase-completion";
import type { ActivityPhase } from "@/lib/types";

export type SessionReportStudentRow = {
  playerId: string;
  nickname: string;
  groupId: string | null;
  groupName: string | null;
  roleLabel: string | null;
  teamRank: number | null;
  personalRank: number | null;
  teamScore: number | null;
  baseScore: number | null;
  testScore: number | null;
  testCorrect: number | null;
  testTotal: number | null;
  improvementPoints: number | null;
  submitted: boolean;
  phaseComplete: boolean;
  snapshot: StudentResultsSnapshot | null;
  practiceWrongAttemptsByQuestion?: number[] | null;
};

export function useSessionReportData(sessionId: string) {
  const sessionQuery = useQuery({
    queryKey: ["host-session", sessionId],
    queryFn: () => getHostSessionDetails(sessionId),
    enabled: Boolean(sessionId),
  });

  const playersQuery = useQuery({
    queryKey: ["host-session-players", sessionId],
    queryFn: () => listSessionPlayers(sessionId),
    enabled: Boolean(sessionId),
  });

  const groupsQuery = useQuery({
    queryKey: ["host-session-groups", sessionId],
    queryFn: () => listSessionGroups(sessionId),
    enabled: Boolean(sessionId),
  });

  const activityPack = useMemo(
    () => parseActivityPack(sessionQuery.data?.activities?.activity_pack),
    [sessionQuery.data?.activities?.activity_pack],
  );

  const reportPhase =
    (sessionQuery.data?.phase as ActivityPhase | undefined) ?? "waiting";

  const groupRows = useMemo<GroupRow[]>(() => groupsQuery.data ?? [], [groupsQuery.data]);

  const players = useMemo<SessionPlayerRow[]>(() => playersQuery.data ?? [], [playersQuery.data]);

  const assignmentGroups = useMemo<GroupAssignmentGroup[]>(() => {
    const grouped = groupPlayersByGroup(players, groupRows);
    return grouped.map((g) => {
      const memberRoleIds = g.members.map((m) => m.assigned_role_id);
      return {
        group: { id: g.group.id, name: g.group.name },
        members: g.members.map((m) => ({
          id: m.id,
          nickname: m.nickname,
          zoneName: activityPack
            ? formatAssignedRoleLabels(activityPack, parseAssignedRoleIds(m), sessionId)
            : null,
          phaseComplete: isPlayerPhaseComplete(reportPhase, m, {
            pack: activityPack,
            memberRoleIds,
          }),
        })),
      };
    });
  }, [players, groupRows, activityPack, sessionId, reportPhase]);

  const resultsMembers = useMemo<SessionResultsMember[]>(
    () =>
      players
        .filter((p) => p.group_id)
        .map((p) => ({
          id: p.id,
          nickname: p.nickname,
          groupId: p.group_id as string,
          assignedRoleId: p.assigned_role_id,
          baseScore: p.base_score,
          individual_quiz_answers: p.individual_quiz_answers ?? [],
          individual_quiz_submitted_at: p.individual_quiz_submitted_at,
          home_group_completed_at: p.home_group_completed_at,
        })),
    [players],
  );

  const sessionResults = useMemo<SessionResultsSummary | null>(() => {
    if (!activityPack || resultsMembers.length === 0) return null;
    return buildSessionResults(
      activityPack,
      groupRows.map((g) => ({ id: g.id, name: g.name })),
      resultsMembers.map((m) => ({
        id: m.id,
        nickname: m.nickname,
        groupId: m.groupId,
        assignedRoleId: m.assignedRoleId,
        baseScore: m.baseScore,
        individual_quiz_answers: m.individual_quiz_answers,
        individual_quiz_submitted_at: m.individual_quiz_submitted_at,
        home_group_completed_at: m.home_group_completed_at,
      })),
      sessionId,
    );
  }, [activityPack, groupRows, resultsMembers, sessionId]);

  const studentRows = useMemo<SessionReportStudentRow[]>(() => {
    const memberRoleIdsByGroup = new Map<string, Array<string | null | undefined>>();
    for (const player of players) {
      if (!player.group_id) continue;
      const list = memberRoleIdsByGroup.get(player.group_id) ?? [];
      list.push(player.assigned_role_id);
      memberRoleIdsByGroup.set(player.group_id, list);
    }

    const rows = players.map((player) => {
      const memberRoleIds = player.group_id
        ? (memberRoleIdsByGroup.get(player.group_id) ?? [])
        : [];
      const phaseComplete = isPlayerPhaseComplete(reportPhase, player, {
        pack: activityPack,
        memberRoleIds,
      });
      const roleLabel = activityPack
        ? formatAssignedRoleLabels(activityPack, parseAssignedRoleIds(player), sessionId)
        : null;

      const snapshot =
        player.group_id && sessionResults
          ? getStudentResultsSnapshot(sessionResults, player.group_id, player.id)
          : null;

      return {
        playerId: player.id,
        nickname: player.nickname?.trim() || "참가자",
        groupId: player.group_id,
        groupName: player.groups?.name ?? snapshot?.groupName ?? null,
        roleLabel,
        teamRank: snapshot?.teamRank ?? null,
        personalRank: snapshot?.personalRank ?? null,
        teamScore: snapshot?.teamScore ?? null,
        baseScore: snapshot?.baseScore ?? (player.base_score != null ? Math.round(player.base_score) : null),
        testScore: snapshot?.testScore ?? null,
        testCorrect: snapshot?.testCorrect ?? null,
        testTotal: snapshot?.testTotal ?? null,
        improvementPoints: snapshot?.improvementPoints ?? null,
        submitted: snapshot?.submitted ?? Boolean(player.individual_quiz_submitted_at),
        phaseComplete,
        snapshot,
        practiceWrongAttemptsByQuestion: player.practice_results.map((r) => r.wrongAttempts),
      };
    });

    return rows.sort((a, b) => {
      const rankA = a.personalRank ?? Number.MAX_SAFE_INTEGER;
      const rankB = b.personalRank ?? Number.MAX_SAFE_INTEGER;
      if (rankA !== rankB) return rankA - rankB;
      return a.nickname.localeCompare(b.nickname, "ko");
    });
  }, [players, sessionResults, activityPack, sessionId, reportPhase]);

  const dataLoading = playersQuery.isLoading || groupsQuery.isLoading;

  return {
    sessionQuery,
    playersQuery,
    groupsQuery,
    activityPack,
    reportPhase,
    groupRows,
    players,
    assignmentGroups,
    resultsMembers,
    sessionResults,
    studentRows,
    hasResultsData: resultsMembers.length > 0,
    hasStudentTable: players.length > 0,
    dataLoading,
  };
}
