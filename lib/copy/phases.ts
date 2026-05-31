import type { ActivityPhase } from "@/lib/types";

/** 활동 진행 단계 — 교사·학생·리포트·샌드박스 공통 */
export const ACTIVITY_PHASE_LABELS: Record<ActivityPhase, string> = {
  waiting: "대기",
  overview: "활동 소개",
  expert_group: "전문가 집단",
  home_group: "홈 집단",
  results: "활동 결과",
};

export const TIMED_PHASE_ORDER = ["overview", "expert_group", "home_group"] as const;
export type TimedPhaseKey = (typeof TIMED_PHASE_ORDER)[number];

export function isTimedPhaseKey(phase: ActivityPhase): phase is TimedPhaseKey {
  return (TIMED_PHASE_ORDER as readonly string[]).includes(phase);
}

export type TimedPhase = TimedPhaseKey;
