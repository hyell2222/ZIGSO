import type { ActivityPhase } from "@/lib/types";

import {
  ACTIVITY_PHASE_LABELS,
  TEACHER_PHASE_STEPS,
  TEACHER_RESULTS_STEP,
} from "@/lib/activity-phases";

/** 단계 번호·오버라인 — 교사·학생 헤더 공통 */
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
      stepLabel: `${TEACHER_RESULTS_STEP.number}단계`,
    };
  }
  const step = TEACHER_PHASE_STEPS.find((s) => s.key === phase);
  const n = step?.number ?? 1;
  return { stepNumber: n, stepLabel: `${n}단계` };
}
