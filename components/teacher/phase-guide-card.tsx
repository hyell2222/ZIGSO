"use client";

import type { ReactNode } from "react";

import { ActivityPhaseHeader } from "@/components/activity/activity-phase-header";
import type { ActivityPhase } from "@/lib/api/activities";
import { getActivityPhaseStep } from "@/lib/activity/phase-steps";
import { TEACHER_PHASE_GUIDES, isTimedPhase } from "@/lib/activity-phases";

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

  if (!isTimedPhase(phase)) return null;

  const guide = TEACHER_PHASE_GUIDES[phase];

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
