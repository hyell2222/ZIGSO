import type { ActivityPhase } from "@/lib/types";

/** 활동 진행 단계 — 교사·학생·리포트·샌드박스 공통 (직소 4단계 + 최종 순위) */
export const ACTIVITY_PHASE_LABELS: Record<ActivityPhase, string> = {
  waiting: "대기",
  overview: "역할 맡기",
  expert_group: "깊게 파고들기",
  home_group: "서로 알려주기",
  individual_quiz: "실력 확인하기",
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

/** 1~4단계 정의 — 학생·교사 UI 공통 */
export const PHASE_STEP_DEFS = [
  {
    key: "overview" as const,
    number: 1,
    title: ACTIVITY_PHASE_LABELS.overview,
    summary: "모둠과 역할(맡을 학습 분량)을 확인합니다.",
    teacherNote:
      "모둠 배정과 각자의 역할을 확인합니다. 학생이 단계 흐름을 익힌 뒤 다음 단계로 넘깁니다.",
  },
  {
    key: "expert_group" as const,
    number: 2,
    title: ACTIVITY_PHASE_LABELS.expert_group,
    summary:
      "같은 역할끼리 모여 맡은 내용을 이해하고, 연습 문제를 모두 풉니다. 문항마다 최대 3번·힌트가 있으며, 문항 점수 평균이 기준 점수가 됩니다.",
    teacherNote:
      "같은 역할끼리 모여 맡은 내용을 익히고, 역할별 연습 문제를 모두 풉니다. 문항 점수의 평균이 각자의 기준 점수가 됩니다.",
  },
  {
    key: "home_group" as const,
    number: 3,
    title: ACTIVITY_PHASE_LABELS.home_group,
    summary:
      "모둠원의 지문을 함께 살펴보고, 모둠원 파트 연습 문제를 직접 풀어 보세요(점수 없음). 내 파트는 푼 답을 확인할 수 있습니다.",
    teacherNote:
      "모둠으로 돌아가 모둠원의 지문·연습 문제를 살보며 서로 설명합니다. 모둠원 파트 연습을 모두 마치면 완료로 표시됩니다.",
  },
  {
    key: "individual_quiz" as const,
    number: 4,
    title: ACTIVITY_PHASE_LABELS.individual_quiz,
    summary:
      "모든 역할의 실전 문제를 한 번만 풉니다. 기준 점수 대비 향상도로 개인·집단 점수가 정해집니다.",
    teacherNote:
      "모든 역할의 실전 문제를 한 번만 풉니다. 모두 제출하면 5단계 최종 순위로 넘어가세요.",
  },
] as const;

export type PhaseStepDef = (typeof PHASE_STEP_DEFS)[number];

export function getPhaseStepDef(phase: TimedPhaseKey): PhaseStepDef {
  return PHASE_STEP_DEFS.find((s) => s.key === phase)!;
}

/** 활동 소개·에디터 안내 — 직소 4단계 흐름 */
export const ACTIVITY_FLOW_STEPS = PHASE_STEP_DEFS.map((s) => ({
  step: s.number,
  title: s.title,
  body: s.summary,
}));

/** 활동 에디터 — 문항 유형 힌트 */
export const EDITOR_QUESTION_HINTS = {
  practice: "2단계 · 깊게 파고들기 — 3회 시도, 오답 시 힌트",
  test: "4단계 · 실력 확인하기 — 1회만 응시",
} as const;

export type PhaseGuide = { title: string; summary: string };

export const TEACHER_PHASE_STEPS = PHASE_STEP_DEFS.map((s) => ({
  key: s.key,
  number: s.number,
  label: s.title,
})) as { key: TimedPhaseKey; number: number; label: string }[];

export const TEACHER_RESULTS_STEP = {
  number: TEACHER_PHASE_STEPS.length + 1,
  label: ACTIVITY_PHASE_LABELS.results,
} as const;

export const TEACHER_PHASE_GUIDES: Record<TimedPhaseKey, PhaseGuide> = Object.fromEntries(
  PHASE_STEP_DEFS.map((s) => [
    s.key,
    { title: s.title, summary: s.teacherNote },
  ]),
) as Record<TimedPhaseKey, PhaseGuide>;

export const TEACHER_PHASE_MINUTES: Record<TimedPhaseKey, number> = {
  overview: 8,
  expert_group: 15,
  home_group: 12,
  individual_quiz: 10,
};

export function isTimedPhase(phase: ActivityPhase): phase is TimedPhaseKey {
  return phase !== "waiting" && phase !== "results";
}

export function isSessionEnded(status: string | null | undefined): boolean {
  return status === "ended";
}
