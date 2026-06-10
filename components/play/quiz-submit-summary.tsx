"use client";

import { ScoreGuideHelpButton } from "@/components/play/score-guide-help-button";
import { ScoreTile } from "@/components/play/score-tile";
import { StadImprovementHelpButton } from "@/components/play/stad-improvement-modal";
import type { StadScoreSnapshot } from "@/lib/activity-pack/stad-guide";

export function QuizSubmitSummary({
  snapshot,
  onOpenBaseScoreGuide,
  onOpenStadGuide,
}: {
  snapshot: StadScoreSnapshot;
  onOpenBaseScoreGuide: () => void;
  onOpenStadGuide: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 @sm:grid-cols-3">
        <ScoreTile
          label="기준 점수"
          value={`${snapshot.baseScore}점`}
          labelExtra={
            <ScoreGuideHelpButton ariaLabel="기준 점수 안내" onClick={onOpenBaseScoreGuide} />
          }
        />
        <ScoreTile
          label="실전 점수"
          value={`${snapshot.testScore}%`}
        />
        <ScoreTile
          label="향상 점수"
          value={`${snapshot.improvementPoints}점`}
          highlight
          labelExtra={<StadImprovementHelpButton onClick={onOpenStadGuide} />}
        />
      </div>
    </div>
  );
}
