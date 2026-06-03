import type { ActivityPhase, SessionStatus } from "@/lib/types";

/** 활동 진행 단계 — 교사·학생·리포트·샌드박스 공통 */
export const ACTIVITY_PHASE_LABELS: Record<ActivityPhase, string> = {
  waiting: "대기",
  overview: "활동 소개",
  expert_group: "전문가 집단",
  home_group: "홈 집단",
  individual_quiz: "개별 형성평가",
  results: "최종 순위",
};

export const TIMED_PHASE_ORDER = [
  "overview",
  "expert_group",
  "home_group",
  "individual_quiz",
] as const;
export type TimedPhaseKey = (typeof TIMED_PHASE_ORDER)[number];
export type TimedPhase = TimedPhaseKey;

export function isTimedPhaseKey(phase: ActivityPhase): phase is TimedPhaseKey {
  return (TIMED_PHASE_ORDER as readonly string[]).includes(phase);
}

export type PhaseGuide = { title: string; summary: string };
export type StepDef = (typeof TEACHER_PHASE_STEPS)[number];

export const TEACHER_PHASE_STEPS = TIMED_PHASE_ORDER.map((key, index) => ({
  key,
  number: index + 1,
  label: ACTIVITY_PHASE_LABELS[key],
})) as { key: TimedPhaseKey; number: number; label: string }[];

export const TEACHER_RESULTS_STEP = {
  number: TEACHER_PHASE_STEPS.length + 1,
  label: ACTIVITY_PHASE_LABELS.results,
} as const;

export const TEACHER_PHASE_GUIDES: Record<TimedPhaseKey, PhaseGuide> = {
  overview: {
    title: ACTIVITY_PHASE_LABELS.overview,
    summary: "모둠·역할·활동 흐름을 확인합니다.",
  },
  expert_group: {
    title: ACTIVITY_PHASE_LABELS.expert_group,
    summary:
      "같은 역할끼리 모여 지문을 익히고, 역할별 연습 문제를 모두 풉니다. 문항 점수의 평균이 각자의 기준 점수가 됩니다.",
  },
  home_group: {
    title: ACTIVITY_PHASE_LABELS.home_group,
    summary:
      "홈 집단으로 돌아가 모둠원의 지문·연습 문제를 보며 서로 설명합니다. 제출 없이 교사가 다음 단계로 넘깁니다.",
  },
  individual_quiz: {
    title: ACTIVITY_PHASE_LABELS.individual_quiz,
    summary:
      "모든 역할의 실전 문제를 한 번만 풉니다. 기준 점수 대비 향상도(STAD)로 개인·집단 점수를 산출합니다.",
  },
};

export const TEACHER_RESULTS_GUIDE = {
  title: ACTIVITY_PHASE_LABELS.results,
  summary: "모둠 순위와 점수를 확인합니다.",
};

export const TEACHER_PHASE_MINUTES: Record<TimedPhaseKey, number> = {
  overview: 8,
  expert_group: 15,
  home_group: 12,
  individual_quiz: 10,
};

export function isTimedPhase(phase: ActivityPhase): phase is TimedPhaseKey {
  return phase !== "waiting" && phase !== "results";
}

/** 진행 단계 번호 (대기·종료 상태 제외). */
export const ACTIVITY_PHASE_NUMBER: Record<
  Exclude<ActivityPhase, "waiting">,
  number
> = {
  overview: 1,
  expert_group: 2,
  home_group: 3,
  individual_quiz: 4,
  results: 5,
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
