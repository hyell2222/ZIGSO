"use client";

import { useMemo } from "react";

import {
  RankLeaderboard,
  RankLeaderboardItem,
  RankListRow,
} from "@/components/activity/rank-display";
import { activityLayoutType } from "@/components/activity/activity-layout-typography";
import { PlayPhaseShell } from "@/components/play/play-phase-shell";
import { PlayStudentTopBanner } from "@/components/play/play-phase-layout";
import { activityPanelCard } from "@/components/activity/activity-layout-chrome";
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

export function ResultsPhasePanel({
  loading,
  results,
  highlightGroupId,
  groupName,
  roleLabel,
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
    <PlayPhaseShell
      contained={contained}
      topBanner={
        <PlayStudentTopBanner
          phase="results"
          groupName={groupName ?? null}
          placeName={roleLabel ?? "—"}
          placeLabel="역할"
          contained={contained}
        />
      }
    >
      {loading ? (
        <LoadingState variant="section" tone="play" label="순위 집계 중…" />
      ) : !snapshot ? (
        <p className={cn("py-8 text-center", activityLayoutType.bodyMuted)}>
          순위를 불러오지 못했어요. 잠시 후 다시 확인해 주세요.
        </p>
      ) : (
        <div className={cn(activityPanelCard, "gap-3")}>
          <h2 className="text-center text-base font-bold text-[var(--foreground)]">최종 순위</h2>
          <RankLeaderboard bordered>
            <RankLeaderboardItem>
              <RankListRow title={teamTitle} rank={snapshot.teamRank} />
            </RankLeaderboardItem>
            <RankLeaderboardItem>
              <RankListRow title="나" rank={snapshot.personalRank} />
            </RankLeaderboardItem>
          </RankLeaderboard>
        </div>
      )}
    </PlayPhaseShell>
  );
}
