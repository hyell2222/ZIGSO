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
    recommendedMinutes: 8,
  },
  {
    key: "expert_group" as const,
    number: 2,
    title: ACTIVITY_PHASE_LABELS.expert_group,
    recommendedMinutes: 12,
  },
  {
    key: "home_group" as const,
    number: 3,
    title: ACTIVITY_PHASE_LABELS.home_group,
    recommendedMinutes: 15,
  },
  {
    key: "individual_quiz" as const,
    number: 4,
    title: ACTIVITY_PHASE_LABELS.individual_quiz,
    recommendedMinutes: 10,
  },
] as const;

type PhaseStepDef = (typeof PHASE_STEP_DEFS)[number];

export function getPhaseStepDef(phase: TimedPhaseKey): PhaseStepDef {
  return PHASE_STEP_DEFS.find((s) => s.key === phase)!;
}

export type PhaseGuideKey = TimedPhaseKey | "results";

export type PhaseStepGuide = {
  intro: string;
  details: readonly string[];
};

/** 단계별 안내 모달 본문 — 교사·학생 공통 */
export const PHASE_STEP_GUIDES: Record<PhaseGuideKey, PhaseStepGuide> = {
  overview: {
    intro: "모둠과 역할이 배정되고, 이번 활동의 목표를 확인하는 단계입니다.",
    details: [
      "화면에 표시된 모둠 번호와 역할(맞출 아이템)을 확인하세요.",
      "같은 역할끼리 다음 단계(전문가 집단)에서 함께 학습합니다.",
      "교사가 단계를 넘기면 전문가 집단 활동이 시작됩니다.",
    ],
  },
  expert_group: {
    intro: "같은 역할 친구들과 함께 맡은 주제를 깊게 학습하는 단계입니다.",
    details: [
      "단서를 단계별로 공개하며 추리하고, 연습 문제에 답합니다.",
      "연습 문제는 문항당 최대 3번까지 제출할 수 있으며, 오답마다 30점씩 감점됩니다.",
      "문항별 점수의 평균이 STAD 기준 점수(0~100점)가 됩니다.",
    ],
  },
  home_group: {
    intro: "우리 모둠으로 돌아와 서로 가르치고 모둠 미션을 완성하는 단계입니다.",
    details: [
      "모둠원마다 맡은 역할의 추리 결과를 공유하세요.",
      "필요한 아이템을 모아 모둠 미션을 함께 해결합니다.",
      "모둠원 모두의 참여가 끝나면 다음 단계로 진행할 수 있습니다.",
    ],
  },
  individual_quiz: {
    intro: "모든 역할 내용을 아우르는 실전 문제에 개인적으로 응시하는 단계입니다.",
    details: [
      "실전 문제는 역할마다 한 번씩만 풀 수 있습니다.",
      "맞힌 문항 비율(%)이 실전 점수가 됩니다.",
      "기준 점수와 비교해 STAD 향상 점수(0~30점)가 정해집니다.",
    ],
  },
  results: {
    intro: "활동 결과와 점수·순위를 확인하며 수업을 마무리하는 단계입니다.",
    details: [
      "기준 점수, 실전 점수, 향상 점수를 한눈에 확인할 수 있습니다.",
      "점수 옆 ? 버튼을 누르면 계산 방법을 자세히 볼 수 있습니다.",
      "모둠 순위와 개인 순위로 협력 학습 성과를 돌아봅니다.",
    ],
  },
};

/** 활동 소개·에디터 안내 — 직소 4단계 흐름 */
export const ACTIVITY_FLOW_STEPS = PHASE_STEP_DEFS.map((s) => ({
  step: s.number,
  title: s.title,
}));

/** 활동 에디터 — 문항 유형 힌트 */
export const EDITOR_QUESTION_HINTS = {
  practice:
    "2단계(깊게 파고들기) 연습 문제입니다. 문항당 최대 3번까지 제출할 수 있고, 틀릴 때마다 30점씩 감점됩니다(100·70·40·10점). 문항별 점수의 평균이 STAD 기준 점수가 됩니다.",
  test:
    "4단계(실력 확인하기) 실전 문제입니다. 역할마다 한 번씩만 응시하며, 맞힌 비율(%)이 실전 점수입니다. 기준 점수와 비교해 STAD 향상 점수(0~30점)가 정해집니다.",
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

export function getPhaseStepGuide(phase: PhaseGuideKey) {
  if (phase === "results") {
    return {
      ...PHASE_STEP_GUIDES.results,
      number: TEACHER_RESULTS_STEP.number,
      title: ACTIVITY_PHASE_LABELS.results,
    };
  }
  const step = getPhaseStepDef(phase);
  return {
    ...PHASE_STEP_GUIDES[phase],
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
export const TEACHER_PHASE_MINUTES: Record<TimedPhaseKey, number> = Object.fromEntries(
  PHASE_STEP_DEFS.map((step) => [step.key, step.recommendedMinutes]),
) as Record<TimedPhaseKey, number>;

export function isTimedPhase(phase: ActivityPhase): phase is TimedPhaseKey {
  return phase !== "waiting" && phase !== "results";
}

export function isSessionEnded(status: string | null | undefined): boolean {
  return status === "ended";
}
