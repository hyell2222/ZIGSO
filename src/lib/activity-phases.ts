import type { ActivityPhase } from "@/lib/types";

/** 활동 진행 단계 — 교사·학생·리포트·샌드박스 공통 (직소 4단계 + 최종 순위) */
export const ACTIVITY_PHASE_LABELS: Record<ActivityPhase, string> = {
  waiting: "",
  overview: "",
  expert_group: "전문가 되기",
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
    key: "expert_group" as const,
    number: 1,
    title: ACTIVITY_PHASE_LABELS.expert_group,
    recommendedMinutes: 10,
  },
  {
    key: "home_group" as const,
    number: 2,
    title: ACTIVITY_PHASE_LABELS.home_group,
    recommendedMinutes: 20,
  },
  {
    key: "individual_quiz" as const,
    number: 3,
    title: ACTIVITY_PHASE_LABELS.individual_quiz,
    recommendedMinutes: 5,
  },
] as const;

export type PhaseStepDef = {
  key: TimedPhaseKey;
  number: number;
  title: string;
  recommendedMinutes: number;
};

export function getPhaseStepDef(phase: TimedPhaseKey): PhaseStepDef {
  return PHASE_STEP_DEFS.find((s) => s.key === phase) || {
    key: "overview" as const,
    number: 0,
    title: ACTIVITY_PHASE_LABELS.overview,
    recommendedMinutes: 8,
  };
}

/** 단계별 안내 모달 본문 — 교사·학생 공통 */
export const PHASE_STEP_GUIDES: Record<Exclude<TimedPhaseKey, "overview">, string[]> = {
  expert_group: [
    "전문가 모둠에서 내가 맡은 학습 내용의 전문가가 되는 단계입니다.",
  ],
  home_group: [
    "홈 모둠에서 서로의 학습 내용을 가르치고 배우는 단계입니다.",
  ],
  individual_quiz: [
    "배운 내용을 바탕으로 개별적으로 최종 실전 문제를 푸는 단계입니다.",
  ]
};

/** 활동 소개·에디터 안내 — 직소 4단계 흐름 */
export const ACTIVITY_FLOW_STEPS = PHASE_STEP_DEFS.map((s) => ({
  step: s.number,
  title: s.title,
}));

/** 활동 에디터 — 문항·내용 유형 힌트 */
export const EDITOR_QUESTION_HINTS = {
  segment:
    "2단계(전문가 되기)에서 해당 역할을 맡은 전문가 학생이 학습할 개념 내용입니다. 모둠원들에게 정확하게 전달할 수 있도록 핵심 원리와 근거를 이해하기 쉽게 작성해 주세요.",
  practice:
    "2단계(전문가 되기) 전문가용 연습 문제들입니다. 학생들은 최대 3회까지 제출 기회를 가지며, 1회차 정답 시 100점, 2회차 70점, 3회차 40점, 실패 시 10점의 기준 점수를 획득합니다.",
  test:
    "4단계(실력 확인하기) 전체 학생용 개별 형성평가 문제입니다. 모든 역할의 문제가 섞여 출제되며, 퀴즈 정답률이 실전 점수가 되고 기준 점수 대비 성장에 따라 STAD 향상 점수(0~30점)가 산출됩니다.",
} as const;

export const TEACHER_PHASE_STEPS = PHASE_STEP_DEFS.map((s) => ({
  key: s.key,
  number: s.number,
  label: s.title,
})) as { key: TimedPhaseKey; number: number; label: string }[];

export const TEACHER_RESULTS_STEP = {
  number: TEACHER_PHASE_STEPS.length + 1,
  label: ACTIVITY_PHASE_LABELS.results,
} as const;

export type PhaseGuideKey = Exclude<TimedPhaseKey, "overview">;

export function getPhaseStepGuide(phase: PhaseGuideKey) {
  const step = getPhaseStepDef(phase);
  const lines = PHASE_STEP_GUIDES[phase] || [];
  return {
    intro: lines.join("\n"),
    details: [] as string[],
    number: step.number,
    title: step.title,
  };
}



/** 5단계 결과 화면 — 학생·교사 공통 문구 */
export const LOADING_COPY = {
  default: "불러오는 중…",
  sessionStarting: "곧 활동이 시작합니다",
  assigningRoles: "모둠과 역할을 배정하는 중이에요…",
  loadingGroupMembers: "모둠원 정보를 불러오는 중이에요.",
  verifying: "확인 중…",
} as const;

export const RESULTS_COPY = {
  loading: LOADING_COPY.default,
  myScores: "나의 점수",
  personalRank: "개인 순위",
  teamRank: "모둠 순위",
  loadError: "잠시 후 다시 확인해 주세요.",
  noTeamRank: "아직 모둠 순위를 표시할 수 없어요.",
  noPersonalRank: "아직 개인 순위를 표시할 수 없어요.",
  reviewQuestions: "문제 다시 보기",
  reviewQuestionsTitle: "문제 해설",
} as const;

/** 단계별 추천·타이머 기본 시간(분) */
export const TEACHER_PHASE_MINUTES: Record<TimedPhaseKey, number> = {
  overview: 8,
  ...Object.fromEntries(
    PHASE_STEP_DEFS.map((step) => [step.key, step.recommendedMinutes]),
  ),
} as Record<TimedPhaseKey, number>;

export function isTimedPhase(phase: ActivityPhase): phase is TimedPhaseKey {
  return phase !== "waiting" && phase !== "overview" && phase !== "results";
}

export function isSessionEnded(status: string | null | undefined): boolean {
  return status === "ended";
}
