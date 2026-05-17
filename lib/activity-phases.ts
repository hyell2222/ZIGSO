import type { ActivityPhase, SessionStatus } from "@/lib/types";

/** 진행 단계 번호 (대기·종료 상태 제외). */
export const ACTIVITY_PHASE_NUMBER: Record<
  Exclude<ActivityPhase, "waiting">,
  number
> = {
  overview: 1,
  expert_group: 2,
  home_group: 3,
  results: 4,
};

export function getActivityPhaseNumber(
  phase: ActivityPhase | string | null | undefined,
): number | null {
  if (!phase || phase === "waiting") return null;
  if (phase in ACTIVITY_PHASE_NUMBER) {
    return ACTIVITY_PHASE_NUMBER[phase as keyof typeof ACTIVITY_PHASE_NUMBER];
  }
  return null;
}

export function isResultsPhase(phase: string | null | undefined): boolean {
  return phase === "results";
}

export function isSessionEnded(status: string | null | undefined): boolean {
  return status === "ended";
}

export function isSessionActive(status: SessionStatus | string | null | undefined): boolean {
  return status !== "ended";
}
