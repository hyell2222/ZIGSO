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
    return <LoadingState variant="section" label="순위 집계 중…" />;
  }

  if (!results?.rankedTeams.length) {
    return <p className={activityLayoutType.bodyMuted}>집계할 순위가 없습니다.</p>;
  }

  return (
    <div className="space-y-5">
      <PhaseSection title="모둠 순위" heading="section" as="h2">
        <RankLeaderboard bordered>
          {results.rankedTeams.map((team) => (
            <RankLeaderboardItem key={team.groupId}>
              <RankListRow title={team.groupName} rank={team.rank} />
            </RankLeaderboardItem>
          ))}
        </RankLeaderboard>
      </PhaseSection>

      <PhaseSection title="개인 순위" heading="section" as="h2">
        {results.rankedMembers.length === 0 ? (
          <p className={activityLayoutType.bodyMuted}>집계할 개인 순위가 없습니다.</p>
        ) : (
          <RankLeaderboard bordered>
            {results.rankedMembers.map((member) => (
              <RankLeaderboardItem key={member.playerId}>
                <RankListRow title={member.nickname} rank={member.rank} />
              </RankLeaderboardItem>
            ))}
          </RankLeaderboard>
        )}
      </PhaseSection>
    </div>
  );
}
