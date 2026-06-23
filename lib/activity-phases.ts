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

export type PhaseGuideKey = TimedPhaseKey | "results";

export type PhaseStepGuide = {
  intro: string;
  details: readonly string[];
};

/** 단계별 안내 모달 본문 — 교사·학생 공통 */
export const PHASE_STEP_GUIDES: Record<PhaseGuideKey, PhaseStepGuide> = {
  overview: {
    intro: "나의 모둠 번호와 오늘 공부해 가르칠 전문가 파트를 확인하는 단계입니다. (연습과 실전 평가의 기반이 됩니다.)",
    details: [
      "내가 가르칠 역할(A~D 파트)을 확인하세요.",
      "다음 단계에서는 다른 모둠의 동일 파트 전문가들과 만나 탐구합니다.",
      "교사가 단계를 진행하면 전문가 활동이 개시됩니다.",
    ],
  },
  expert_group: {
    intro: "같은 파트의 지문을 공부하고 연습문제를 풀어 나의 '기준 점수(0~100점)'를 획득하는 단계입니다. (AI 힌트/해설을 참고할 수 있으나, 오답 시 점수가 감점됩니다.)",
    details: [
      "제시된 파트의 지문을 꼼꼼히 읽고 개념을 학습하세요.",
      "학습 후 연습문제를 풀며 이해도를 스스로 확인합니다.",
      "연습문제는 3번까지 풀 수 있고, 정답 시도 차수에 따라 나의 기준 점수가 결정됩니다.",
    ],
  },
  home_group: {
    intro: "공부해 온 내용을 동료들에게 가르쳐주며, 실전 퀴즈에서 높은 점수를 얻도록 서로 도우며 배움을 공유하는 단계입니다.",
    details: [
      "모둠원들에게 내가 공부해 온 파트의 내용을 차례대로 가르쳐 주세요.",
      "동료가 공부한 파트의 지문과 연습문제를 화면으로 확인하고 풀어주며 튜터링을 진행합니다.",
      "모든 모둠원의 지식 전수가 완료되면 다음 실전 평가로 나아갑니다.",
    ],
  },
  individual_quiz: {
    intro: "모든 파트의 실전 문제를 풀어 획득한 '실전 점수'와 이전 '기준 점수'를 비교해 최종 '향상 점수(0~30점)'를 내는 단계입니다.",
    details: [
      "모둠원들의 설명을 토대로 전체 범위의 실전 문제(1회 응시)를 해결합니다.",
      "내가 얻은 실전 점수와 이전 전문가 단계 기준 점수를 비교하여 향상 점수가 결정됩니다.",
    ],
  },
  results: {
    intro: "개인별 성장도(향상 점수)의 모둠 평균을 합산하여 최종 'STAD 모둠 순위'와 성과를 함께 돌아보는 단계입니다.",
    details: [
      "나의 기준 점수, 실전 점수, 최종 향상도를 확인합니다.",
      "개인의 성장을 합산하여 산출된 모둠 최종 성취 순위를 비교합니다.",
      "문제 다시 보기를 통해 오답 원인을 정리하고 활동을 마칩니다.",
    ],
  },
};

/** 활동 소개·에디터 안내 — 직소 4단계 흐름 */
export const ACTIVITY_FLOW_STEPS = PHASE_STEP_DEFS.map((s) => ({
  step: s.number,
  title: s.title,
}));

/** 활동 에디터 — 문항·지문 유형 힌트 */
export const EDITOR_QUESTION_HINTS = {
  segment:
    "2단계(깊게 파고들기)에서 해당 역할을 맡은 전문가 학생이 학습할 개념 지문입니다. 모둠원들에게 정확하게 전달할 수 있도록 핵심 원리와 근거를 이해하기 쉽게 작성해 주세요.",
  practice:
    "2단계(깊게 파고들기) 전문가용 연습 문제들입니다. 학생들은 최대 3회까지 제출 기회를 가지며, 1회차 정답 시 100점, 2회차 70점, 3회차 40점, 실패 시 10점의 기준 점수를 획득합니다.",
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

export function getPhaseStepGuide(phase: PhaseGuideKey) {
  if (phase === "results") {
    return {
      ...PHASE_STEP_GUIDES.results,
      number: TEACHER_RESULTS_STEP.number,
      title: ACTIVITY_PHASE_LABELS.results,
    };
  }
  if (phase === "overview") {
    return {
      ...PHASE_STEP_GUIDES.overview,
      number: 0,
      title: ACTIVITY_PHASE_LABELS.overview,
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
