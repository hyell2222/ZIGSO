"use client";

import { ScoreTile } from "@/components/play/score-tile";
import type { StudentResultsSnapshot } from "@/lib/activity-pack/session-results";

export function StudentResultsSummary({ snapshot }: { snapshot: StudentResultsSnapshot }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <ScoreTile label="기준 점수" value={`${snapshot.baseScore}점`} />
      <ScoreTile label="실전 점수" value={`${snapshot.testScore}%`} />
      <ScoreTile
        label="향상 점수"
        value={`${snapshot.improvementPoints}점`}
        highlight
      />
    </div>
  );
}
