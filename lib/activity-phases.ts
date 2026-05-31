import type { ActivityPhase, SessionStatus } from "@/lib/types";

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
    summary: "모둠·역할·공유 학습지를 확인하고 활동을 시작합니다.",
  },
  expert_group: {
    title: ACTIVITY_PHASE_LABELS.expert_group,
    summary:
      "같은 역할끼리 5단계 단서로 단어를 맞히고, 획득한 단어 카드를 홈 집단에서 모둠원에게 설명합니다.",
  },
  home_group: {
    title: ACTIVITY_PHASE_LABELS.home_group,
    summary:
      "공유 학습지의 최종 요약문 빈칸을 채웁니다. 내 단어는 내 빈칸에 넣을 수 없고, 팀원 슬롯에만 배치할 수 있습니다.",
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
