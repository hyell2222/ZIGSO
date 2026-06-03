import type { ActivityPhase, SessionStatus } from "@/lib/types";

/** 활동 진행 단계 — 교사·학생·리포트·샌드박스 공통 */
export const ACTIVITY_PHASE_LABELS: Record<ActivityPhase, string> = {
  waiting: "대기",
  overview: "활동 소개",
  expert_group: "전문가 집단",
  home_group: "홈 집단",
  individual_quiz: "개별 퀴즈",
  results: "활동 결과",
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
    summary: "모둠·역할·활동 흐름을 확인하고 활동을 시작합니다.",
  },
  expert_group: {
    title: ACTIVITY_PHASE_LABELS.expert_group,
    summary:
      "같은 역할끼리 모여 자신이 맡은 지문 조각·풀이 방식을 마스터합니다.",
  },
  home_group: {
    title: ACTIVITY_PHASE_LABELS.home_group,
    summary:
      "홈 집단으로 돌아가 각자 맡은 부분을 설명하고, 모둠이 함께 집단 퀴즈를 풉니다. (집단 점수)",
  },
  individual_quiz: {
    title: ACTIVITY_PHASE_LABELS.individual_quiz,
    summary:
      "각자 전체 내용에 대한 개별 퀴즈를 풉니다. (개별 점수)",
  },
};

export const TEACHER_RESULTS_GUIDE = {
  title: ACTIVITY_PHASE_LABELS.results,
  summary:
    "모둠 순위와 MVP를 확인합니다. 수업 마무리 후 진행하세요. 화면을 닫으면 세션이 종료됩니다.",
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
