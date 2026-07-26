"use client";

import { useMemo } from "react";

import { RankResultTile } from "@/components/activity/rank-display";
import { playPhaseDualSectionGrid } from "@/lib/theme/activity-layout-chrome";
import { activityLayoutType } from "@/lib/theme/activity-layout-typography";
import { PhaseSection } from "@/components/activity/phase-section-layout";
import { LoadingState } from "@/components/ui/loading-state";
import { formatGroupDisplayName } from "@/lib/activity-pack/engine";
import { buildSessionResults } from "@/lib/activity-pack/session-results";
import type { ActivityPack } from "@/lib/activity-pack/types";
import type { GroupRow } from "@/lib/api/play";
import { RESULTS_COPY } from "@/lib/activity-pack/activity-phases";
import { cn } from "@/lib/utils";

export type SessionResultsMember = {
  id: string;
  nickname: string | null;
  groupId: string;
  assignedRoleId: string | null;
  baseScore?: number | null;
  individual_quiz_answers?: import("@/lib/activity-pack/types").QuizAnswer[];
  individual_quiz_submitted_at?: string | null;
  home_group_completed_at?: string | null;
};

type Props = {
  groups: GroupRow[];
  members: SessionResultsMember[];
  pack: ActivityPack | null;
  roleScopeKey?: string;
  loading?: boolean;
};

const sectionCenterClass =
  "[&>div:first-child]:justify-center [&>div:first-child>div]:flex-none [&>div:first-child>div]:text-center";

export function SessionResultsDashboard({
  groups,
  members,
  pack,
  roleScopeKey,
  loading,
}: Props) {
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
        home_group_completed_at: m.home_group_completed_at,
      })),
      roleScopeKey,
    );
  }, [pack, groups, members, roleScopeKey]);

  if (loading) {
    return (
      <LoadingState variant="section" label={RESULTS_COPY.loading} className="min-h-0 flex-1" />
    );
  }

  if (!results?.rankedTeams.length) {
    return (
      <p className={cn("text-center", activityLayoutType.bodyMuted)}>
        {RESULTS_COPY.noTeamRank}
      </p>
    );
  }

  return (
    <div className={playPhaseDualSectionGrid}>
      <PhaseSection
        title={RESULTS_COPY.teamRank}
        heading="section"
        as="h2"
        className={cn("h-fit w-full", sectionCenterClass)}
      >
        <div className="flex flex-col gap-2">
          {results.rankedTeams.map((team) => (
            <RankResultTile
              key={team.groupId}
              label={formatGroupDisplayName(team.groupName)}
              rank={team.rank}
              score={`${team.teamScore}점`}
              durationText={team.durationText}
            />
          ))}
        </div>
      </PhaseSection>

      <PhaseSection
        title={RESULTS_COPY.personalRank}
        heading="section"
        as="h2"
        className={cn("h-fit w-full", sectionCenterClass)}
      >
        {results.rankedMembers.length === 0 ? (
          <p className={cn("text-center", activityLayoutType.bodyMuted)}>
            {RESULTS_COPY.noPersonalRank}
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {results.rankedMembers.map((member) => (
              <RankResultTile
                key={member.playerId}
                label={member.nickname}
                rank={member.rank}
                score={`${member.improvementPoints}점`}
                durationText={member.durationText}
              />
            ))}
          </div>
        )}
      </PhaseSection>
    </div>
  );
}
