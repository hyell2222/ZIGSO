"use client";

import { PhaseStepGuideCard } from "@/components/activity/phase-step-guide-card";
import type { ActivityPhase } from "@/lib/api/activities";
import { isTimedPhase } from "@/lib/activity-phases";

/** 호스트 화면 — stepper + 단계 안내 카드 */
export function PhaseGuideCard({
  phase,
  className,
}: {
  phase: ActivityPhase;
  className?: string;
}) {
  if (!isTimedPhase(phase)) return null;

  return <PhaseStepGuideCard phase={phase} surface="band" className={className} />;
}
