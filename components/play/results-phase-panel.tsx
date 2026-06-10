"use client";

import { useMemo } from "react";

import {
  RankLeaderboard,
  RankLeaderboardItem,
  RankListRow,
} from "@/components/activity/rank-display";
import { activityLayoutType } from "@/components/activity/activity-layout-typography";
import { PhaseSection } from "@/components/activity/phase-section-layout";
import { PlayPhaseShell } from "@/components/play/play-phase-shell";
import { StudentResultsSummary } from "@/components/play/student-results-summary";
import { LoadingState } from "@/components/ui/loading-state";
import { formatGroupDisplayName } from "@/lib/activity-pack/engine";
import {
  getStudentResultsSnapshot,
  type SessionResultsSummary,
} from "@/lib/activity-pack/session-results";
import { cn } from "@/lib/utils";

type Props = {
  loading: boolean;
  title: string | null;
  results: SessionResultsSummary | null;
  highlightGroupId?: string | null;
  groupName?: string | null;
  roleLabel?: string | null;
  currentPlayerId?: string | null;
  contained?: boolean;
};

const sectionCenterClass =
  "[&>div:first-child]:justify-center [&>div:first-child>div]:flex-none [&>div:first-child>div]:text-center";

export function ResultsPhasePanel({
  loading,
  results,
  highlightGroupId,
  groupName,
  currentPlayerId,
  contained = false,
}: Props) {
  const snapshot = useMemo(
    () =>
      results
        ? getStudentResultsSnapshot(results, highlightGroupId, currentPlayerId)
        : null,
    [results, highlightGroupId, currentPlayerId],
  );

  const teamTitle = formatGroupDisplayName(
    groupName?.trim() || snapshot?.groupName || null,
  );

  return (
    <PlayPhaseShell contained={contained} mainClassName="flex flex-1 flex-col">
      <div
        className={cn(
          "flex flex-1 flex-col items-center px-4 py-6 @sm:px-6 @sm:py-10",
          contained ? "min-h-[min(14rem,38dvh)]" : "min-h-[min(20rem,52dvh)]",
        )}
      >
        {loading ? (
          <div className="flex w-full flex-1 items-center justify-center">
            <LoadingState variant="section" tone="play" label="순위 집계 중…" />
          </div>
        ) : !snapshot ? (
          <p className={cn("text-center", activityLayoutType.bodyMuted)}>
            순위를 불러오지 못했어요. 잠시 후 다시 확인해 주세요.
          </p>
        ) : (
          <div className="mx-auto flex w-full max-w-xs flex-col items-center gap-5">
            <PhaseSection
              title="내 점수"
              heading="section"
              as="h2"
              className={cn("w-full", sectionCenterClass)}
            >
              <StudentResultsSummary snapshot={snapshot} />
            </PhaseSection>

            <PhaseSection
              title="개인 순위"
              heading="section"
              as="h2"
              className={cn("w-full", sectionCenterClass)}
            >
              <RankLeaderboard bordered>
                <RankLeaderboardItem>
                  <RankListRow
                    title="나"
                    rank={snapshot.personalRank}
                    score={`${snapshot.improvementPoints}점`}
                  />
                </RankLeaderboardItem>
              </RankLeaderboard>
            </PhaseSection>

            <PhaseSection
              title="모둠 순위"
              heading="section"
              as="h2"
              className={cn("w-full", sectionCenterClass)}
            >
              <RankLeaderboard bordered>
                <RankLeaderboardItem>
                  <RankListRow
                    title={teamTitle}
                    rank={snapshot.teamRank}
                    score={`${snapshot.teamScore}점`}
                  />
                </RankLeaderboardItem>
              </RankLeaderboard>
            </PhaseSection>
          </div>
        )}
      </div>
    </PlayPhaseShell>
  );
}
