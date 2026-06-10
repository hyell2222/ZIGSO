"use client";

import { ScoreGuideHelpButton } from "@/components/play/score-guide-help-button";
import { ScoreTile } from "@/components/play/score-tile";

type Props = {
  baseScore: number;
  onOpenBaseScoreGuide: () => void;
};

export function PracticeCompleteSummary({ baseScore, onOpenBaseScoreGuide }: Props) {
  return (
    <ScoreTile
      label="기준 점수"
      value={`${baseScore}점`}
      highlight
      labelExtra={
        <ScoreGuideHelpButton ariaLabel="기준 점수 안내" onClick={onOpenBaseScoreGuide} />
      }
    />
  );
}
