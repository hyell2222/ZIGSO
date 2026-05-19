"use client";

import type { ReactNode } from "react";

import { ActivityPhaseHeader } from "@/components/activity/activity-phase-header";
import type { ActivityPhase } from "@/lib/api/activities";
import { getActivityPhaseStep } from "@/lib/activity/phase-steps";
import { isResultsPhase } from "@/lib/activity-phases";
import { PHASE_GUIDES, RESULTS_PHASE_GUIDE, isTimedPhase } from "@/lib/teacher/phase-guide";

/**
 * 호스트 화면 단계 안내 — `ActivityPhaseHeader` 래퍼.
 */
export function PhaseGuideCard({
  phase,
  meta,
  contained = false,
  rightSlot,
}: {
  phase: ActivityPhase;
  meta?: ReactNode;
  contained?: boolean;
  rightSlot?: ReactNode;
}) {
  if (phase === "waiting") {
    return null;
  }

  const { stepNumber, stepLabel } = getActivityPhaseStep(phase);

  if (isResultsPhase(phase)) {
    return (
      <ActivityPhaseHeader
        stepNumber={stepNumber}
        stepLabel={stepLabel}
        title={RESULTS_PHASE_GUIDE.title}
        description={RESULTS_PHASE_GUIDE.summary}
        contained={contained}
        as="h2"
        meta={meta}
        rightSlot={rightSlot}
      />
    );
  }

  if (!isTimedPhase(phase)) return null;

  const guide = PHASE_GUIDES[phase];

  return (
    <ActivityPhaseHeader
      stepNumber={stepNumber}
      stepLabel={stepLabel}
      title={guide.title}
      description={guide.summary}
      contained={contained}
      as="h2"
      meta={meta}
      rightSlot={rightSlot}
    />
  );
}
