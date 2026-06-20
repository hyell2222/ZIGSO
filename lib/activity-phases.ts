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
    intro: "배정된 원모둠원들을 확인하고, 자신이 깊게 탐구할 '전문가 역할'을 확인하는 단계입니다.",
    details: [
      "내가 속한 모둠 번호와 이번 활동에서 가르쳐야 할 나의 역할을 확인해 보세요.",
      "같은 역할을 맡은 다른 모둠의 전문가 친구들과 함께 다음 단계에서 만나 학습하게 됩니다.",
      "선생님이 단계를 전환하면 전문가 모둠 활동이 시작됩니다.",
    ],
  },
  expert_group: {
    intro: "같은 역할을 맡은 전문가 친구들과 모여, 자신에게 주어진 지문을 읽고 핵심 개념을 탐구하는 단계입니다.",
    details: [
      "화면에 제시된 지문과 단서들을 꼼꼼히 읽고 개념을 파악해 보세요.",
      "학습을 마친 후 연습 문제를 풀며 내용을 점검합니다.",
      "연습 문제는 문항당 최대 3번까지 도전할 수 있으며, 정답률에 따라 나의 Jigsaw '기준 점수'가 결정됩니다.",
    ],
  },
  home_group: {
    intro: "원래의 원모둠으로 돌아와, 자신이 공부해 온 내용을 모둠원들에게 설명하고 가르치는 단계입니다.",
    details: [
      "모둠원들은 각자 서로 다른 주제를 깊이 있게 공부해 온 전문가들입니다.",
      "돌아가며 자신이 맡은 역할의 지문 내용과 정답을 차례대로 자세히 설명해 주세요.",
      "서로 가르쳐 주는 배움의 과정이 끝나면, 모둠원 전체가 준비되어 실전 문제 단계로 나아갈 수 있습니다.",
    ],
  },
  individual_quiz: {
    intro: "모든 역할의 지문과 퀴즈를 망라한 실전 문제를 혼자서 스스로 풀어보는 단계입니다.",
    details: [
      "실전 문제는 도움 없이 개인별로 한 번씩만 응시합니다.",
      "원모둠원들의 설명을 잘 들었다면 모든 문항을 쉽게 맞힐 수 있습니다.",
      "실전 점수가 이전에 전문가 단계에서 얻은 기준 점수보다 얼마나 향상되었는지에 따라 '향상 점수'가 계산됩니다.",
    ],
  },
  results: {
    intro: "활동 결과로 산출된 나의 향상 점수와 우리 모둠의 협동 성과를 함께 돌아보는 단계입니다.",
    details: [
      "나의 기준 점수, 실전 퀴즈 점수, 최종 향상 점수를 한눈에 확인합니다.",
      "각자의 학습 향상 수준이 반영된 모둠 전체의 순위를 비교해 봅니다.",
      "문제를 다시 보며 모둠원들과 함께 오답의 이유를 최종 정리하고 학습을 마무리합니다.",
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
