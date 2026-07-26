"use client";

import { useMemo, useState } from "react";

import {
  RankResultTile,
} from "@/components/activity/rank-display";
import { playPhaseDualSectionGrid } from "@/lib/theme/activity-layout-chrome";
import { activityLayoutType } from "@/lib/theme/activity-layout-typography";
import { PhaseSection } from "@/components/activity/phase-section-layout";
import { BaseScoreGuideModal } from "@/components/play/modals/base-score-guide-modal";
import { PlayPhaseShell } from "@/components/play/shell/play-phase-shell";
import { PlayStudentTopBanner } from "@/components/play/shell/play-student-top-banner";
import { StudentResultsSummary } from "@/components/play/stad/student-results-summary";
import { StadImprovementModal } from "@/components/play/modals/stad-improvement-modal";
import { TestScoreGuideModal } from "@/components/play/modals/test-score-guide-modal";
import { LoadingState } from "@/components/ui/loading-state";
import { formatGroupDisplayName } from "@/lib/activity-pack/engine";
import { RESULTS_COPY } from "@/lib/activity-pack/activity-phases";
import {
  getStudentResultsSnapshot,
  type SessionResultsSummary,
} from "@/lib/activity-pack/session-results";
import { cn } from "@/lib/utils";

type Props = {
  loading: boolean;
  results: SessionResultsSummary | null;
  highlightGroupId?: string | null;
  groupName?: string | null;
  roleLabel?: string | null;
  currentPlayerId?: string | null;
};

const sectionCenterClass =
  "[&>div:first-child]:justify-center [&>div:first-child>div]:flex-none [&>div:first-child>div]:text-center";

export function ResultsPhasePanel({
  loading,
  results,
  highlightGroupId,
  groupName,
  roleLabel,
  currentPlayerId,
}: Props) {
  const [baseScoreGuideOpen, setBaseScoreGuideOpen] = useState(false);
  const [testScoreGuideOpen, setTestScoreGuideOpen] = useState(false);
  const [stadGuideOpen, setStadGuideOpen] = useState(false);

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
      mainClassName="flex flex-col @md:items-center min-h-0 @md:flex-1 @md:justify-center @md:min-h-[calc(100dvh-180px)]"
      overlay={
        <>
          <BaseScoreGuideModal
            open={baseScoreGuideOpen}
            onClose={() => setBaseScoreGuideOpen(false)}
          />
          <StadImprovementModal
            open={stadGuideOpen}
            onClose={() => setStadGuideOpen(false)}
          />
          <TestScoreGuideModal
            open={testScoreGuideOpen}
            onClose={() => setTestScoreGuideOpen(false)}
          />
        </>
      }
    >
      {loading ? (
        <LoadingState
          variant="section"
          label={RESULTS_COPY.loading}
          className="min-h-0 flex-1"
        />
      ) : !snapshot ? (
        <p className={cn("text-center", activityLayoutType.bodyMuted)}>
          {RESULTS_COPY.loadError}
        </p>
      ) : (
        <div className={cn(playPhaseDualSectionGrid, "max-w-4xl w-full items-center")}>
          <PhaseSection
            title={RESULTS_COPY.myScores}
            heading="section"
            as="h2"
            className={cn("w-full", sectionCenterClass)}
          >
            <StudentResultsSummary
              snapshot={snapshot}
              onOpenBaseScoreGuide={() => setBaseScoreGuideOpen(true)}
              onOpenTestScoreGuide={() => setTestScoreGuideOpen(true)}
              onOpenStadGuide={() => setStadGuideOpen(true)}
            />
          </PhaseSection>

          <div className="flex flex-col gap-4 w-full">
            <PhaseSection
              title={RESULTS_COPY.teamRank}
              heading="section"
              as="h2"
              className={cn("w-full h-fit", sectionCenterClass)}
            >
              <RankResultTile
                label={teamTitle}
                rank={snapshot.teamRank}
                score={`${snapshot.teamScore}점`}
                durationText={snapshot.teamDurationText}
                highlight
              />
            </PhaseSection>

            <PhaseSection
              title={RESULTS_COPY.personalRank}
              heading="section"
              as="h2"
              className={cn("w-full h-fit", sectionCenterClass)}
            >
              <RankResultTile
                label="나"
                rank={snapshot.personalRank}
                score={`${snapshot.improvementPoints}점`}
                durationText={snapshot.durationText}
              />
            </PhaseSection>
          </div>
        </div>
      )}
    </PlayPhaseShell>
  );
}
