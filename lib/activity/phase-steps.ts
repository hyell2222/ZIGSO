import type { ActivityPhase } from "@/lib/types";

import { ACTIVITY_PHASE_LABELS } from "@/lib/copy/phases";
import { PHASES, RESULTS_PHASE_STEP } from "@/lib/copy/teacher";

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
      stepNumber: RESULTS_PHASE_STEP.number,
      stepLabel: `${RESULTS_PHASE_STEP.number}단계`,
    };
  }
  const step = PHASES.find((s) => s.key === phase);
  const n = step?.number ?? 1;
  return { stepNumber: n, stepLabel: `${n}단계` };
}

/** 학생 play 패널 `phase: 1 | 2 | 3 | 4` → 단계 번호 */
export function playPanelPhaseToStepNumber(phase: 1 | 2 | 3 | 4): number {
  return phase;
}
