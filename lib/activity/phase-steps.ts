import type { ActivityPhase } from "@/lib/types";

import {
  ACTIVITY_PHASE_LABELS,
  TEACHER_PHASE_STEPS,
  TEACHER_RESULTS_STEP,
  type TimedPhaseKey,
} from "@/lib/activity-phases";

/** 단계 번호·오버라인 — 교사 호스트 헤더 */
export function getActivityPhaseStep(phase: ActivityPhase): {
  stepNumber: number | null;
  stepLabel: string;
} {
  if (phase === "waiting") {
    return { stepNumber: null, stepLabel: ACTIVITY_PHASE_LABELS.waiting };
  }
  if (phase === "results") {
    return {
      stepNumber: TEACHER_RESULTS_STEP.number,
      stepLabel: `${TEACHER_RESULTS_STEP.number}단계 · ${TEACHER_RESULTS_STEP.label}`,
    };
  }
  const step = TEACHER_PHASE_STEPS.find((s) => s.key === phase);
  const n = step?.number ?? 1;
  const name = step?.label ?? ACTIVITY_PHASE_LABELS[phase as TimedPhaseKey];
  return { stepNumber: n, stepLabel: `${n}단계 · ${name}` };
}
