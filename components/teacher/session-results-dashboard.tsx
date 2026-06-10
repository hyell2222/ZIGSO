"use client";

import { useMemo } from "react";

import {
  RankLeaderboard,
  RankLeaderboardItem,
  RankListRow,
} from "@/components/activity/rank-display";
import { activityLayoutType } from "@/components/activity/activity-layout-typography";
import { PhaseSection } from "@/components/activity/phase-section-layout";
import { LoadingState } from "@/components/ui/loading-state";
import { buildSessionResults } from "@/lib/activity-pack/session-results";
import type { ActivityPack } from "@/lib/activity-pack/types";
import type { GroupRow } from "@/lib/api/play";
import { cn } from "@/lib/utils";

export type SessionResultsMember = {
  id: string;
  nickname: string | null;
  groupId: string;
  assignedRoleId: string | null;
  baseScore?: number | null;
  individual_quiz_answers?: import("@/lib/activity-pack/types").QuizAnswer[];
  individual_quiz_submitted_at?: string | null;
};

type Props = {
  groups: GroupRow[];
  members: SessionResultsMember[];
  pack: ActivityPack | null;
  roleScopeKey?: string;
  loading?: boolean;
  contained?: boolean;
};

const sectionCenterClass =
  "[&>div:first-child]:justify-center [&>div:first-child>div]:flex-none [&>div:first-child>div]:text-center";

export function SessionResultsDashboard({
  groups,
  members,
  pack,
  roleScopeKey,
  loading,
  contained = false,
}: Props) {
  void contained;

  const results = useMemo(() => {
    if (!pack) return null;
    return buildSessionResults(
      pack,
      groups.map((g) => ({
        id: g.id,
        name: g.name,
      })),
      members.map((m) => ({
        id: m.id,
        nickname: m.nickname,
        groupId: m.groupId,
        assignedRoleId: m.assignedRoleId,
        baseScore: m.baseScore,
        individual_quiz_answers: m.individual_quiz_answers,
        individual_quiz_submitted_at: m.individual_quiz_submitted_at,
      })),
      roleScopeKey,
    );
  }, [pack, groups, members, roleScopeKey]);

  if (loading) {
    return (
      <div className="flex w-full justify-center py-8">
        <LoadingState variant="section" label="순위 집계 중…" />
      </div>
    );
  }

  if (!results?.rankedTeams.length) {
    return (
      <p className={cn("text-center", activityLayoutType.bodyMuted)}>집계할 순위가 없습니다.</p>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-xs flex-col items-center gap-5">
        <PhaseSection
          title="모둠 순위"
          heading="section"
          as="h2"
          className={cn("w-full", sectionCenterClass)}
        >
          <RankLeaderboard bordered>
            {results.rankedTeams.map((team) => (
              <RankLeaderboardItem key={team.groupId}>
                <RankListRow
                  title={team.groupName}
                  rank={team.rank}
                  score={`${team.teamScore}점`}
                />
              </RankLeaderboardItem>
            ))}
          </RankLeaderboard>
        </PhaseSection>

        <PhaseSection
          title="개인 순위"
          heading="section"
          as="h2"
          className={cn("w-full", sectionCenterClass)}
        >
          {results.rankedMembers.length === 0 ? (
            <p className={cn("text-center", activityLayoutType.bodyMuted)}>
              집계할 개인 순위가 없습니다.
            </p>
          ) : (
            <RankLeaderboard bordered>
              {results.rankedMembers.map((member) => (
                <RankLeaderboardItem key={member.playerId}>
                  <RankListRow
                    title={member.nickname}
                    rank={member.rank}
                    score={`${member.improvementPoints}점`}
                  />
                </RankLeaderboardItem>
              ))}
            </RankLeaderboard>
          )}
        </PhaseSection>
    </div>
  );
}
