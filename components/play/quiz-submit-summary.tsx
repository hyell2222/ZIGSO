"use client";

import { ScoreGuideHelpButton } from "@/components/play/score-guide-help-button";
import { ScoreTile } from "@/components/play/score-tile";
import { StadImprovementHelpButton } from "@/components/play/stad-improvement-modal";
import { TestScoreGuideHelpButton } from "@/components/play/test-score-guide-modal";
import type { StadScoreSnapshot } from "@/lib/activity-pack/stad-guide";

export function QuizSubmitSummary({
  snapshot,
  onOpenBaseScoreGuide,
  onOpenTestScoreGuide,
  onOpenStadGuide,
}: {
  snapshot: StadScoreSnapshot;
  onOpenBaseScoreGuide: () => void;
  onOpenTestScoreGuide: () => void;
  onOpenStadGuide: () => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <ScoreTile
        label="기준 점수"
        value={`${snapshot.baseScore}점`}
        labelExtra={
          <ScoreGuideHelpButton ariaLabel="기준 점수 안내" onClick={onOpenBaseScoreGuide} />
        }
      />
      <ScoreTile
        label="실전 점수"
        value={`${snapshot.testScore}점`}
        labelExtra={<TestScoreGuideHelpButton onClick={onOpenTestScoreGuide} />}
      />
      <ScoreTile
        label="향상 점수"
        value={`${snapshot.improvementPoints}점`}
        highlight
        labelExtra={<StadImprovementHelpButton onClick={onOpenStadGuide} />}
      />
    </div>
  );
}
