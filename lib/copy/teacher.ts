import { getNextPhase } from "@/lib/api/sessions";
import { ACTIVITY_PHASE_LABELS, TIMED_PHASE_ORDER, type TimedPhaseKey } from "@/lib/copy/phases";
import type { ActivityPhase } from "@/lib/types";

export type { TimedPhase, TimedPhaseKey } from "@/lib/copy/phases";
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

export const TEACHER_PHASE_GUIDES: Record<
  TimedPhaseKey,
  { title: string; summary: string }
> = {
  overview: {
    title: ACTIVITY_PHASE_LABELS.overview,
    summary: "모둠·역할·모둠 미션을 확인하고 활동을 시작합니다.",
  },
  expert_group: {
    title: ACTIVITY_PHASE_LABELS.expert_group,
    summary:
      "같은 역할끼리 5단계 단서로 맞출 아이템을 찾고, 홈 집단으로 돌아가 모둠원에게 공유합니다.",
  },
  home_group: {
    title: ACTIVITY_PHASE_LABELS.home_group,
    summary: "모둠이 모은 맞출 아이템으로 모둠 미션을 해결하고 최종 결과를 제출합니다.",
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

export function isTeacherTimedPhase(phase: ActivityPhase): phase is TimedPhaseKey {
  return phase !== "waiting" && phase !== "results";
}

/** @deprecated `isTeacherTimedPhase` 사용 권장 */
export const isTimedPhase = isTeacherTimedPhase;

export const PHASES = TEACHER_PHASE_STEPS;
export const RESULTS_PHASE_STEP = TEACHER_RESULTS_STEP;
export const PHASE_GUIDES = TEACHER_PHASE_GUIDES;
export const RESULTS_PHASE_GUIDE = TEACHER_RESULTS_GUIDE;
export const PHASE_MINUTES = TEACHER_PHASE_MINUTES;

export const HOST_COPY = {
  startSession: "수업 시작",
  nextPhase: "다음 단계",
  viewResults: "활동 결과",
  joinCodeLabel: "참가 코드",
  joinQrTitle: "학생 입장 QR",
  sessionEnded: "종료된 세션",
  timerTitle: "타이머",
  waitingRosterTitle: "입장 대기",
  waitingRosterSubtitle: "참가 코드로 들어왔고, 수업 시작을 기다리는 학생입니다.",
  assignmentTitle: "역할·맞출 아이템 배정",
  assignmentByItem: "학생별 맞출 아이템",
  assignmentByGroup: "모둠별 구성",
  noAssignmentItem: "배정된 맞출 아이템이 없습니다.",
  noAssignmentGroup: "배정된 모둠이 없습니다.",
  progressTitle: "모둠 미션 진행",
  progressSubtitle: "맞출 아이템 획득·모둠 미션 완료·최종 제출 현황",
  progressComplete: "완료",
  progressOngoing: "진행 중",
  resultsTitle: "모둠 순위",
  resultsSubtitle: "모둠별 총점과 MVP. 개인 순위는 학생 화면에서 확인합니다.",
  resultsEmpty: "집계할 모둠 결과가 없습니다.",
  resultsAggregating: "결과 집계 중…",
} as const;

export const TEACHER_NAV_COPY = {
  activities: "내 활동",
  reports: "수업 기록",
} as const;

export const TEACHER_ACTIVITIES_COPY = {
  pageTitle: "내 활동",
  pageDescription:
    "활동을 설계한 뒤 수업을 시작하면, 학생이 참가 코드로 입장해 직소·STAD 단계를 진행합니다.",
  createButton: "새 활동 만들기",
  startSession: "수업 시작",
  startingSession: "수업 시작하는 중…",
  preview: "수업 미리보기",
  groupMeta: (size: string | number, missions: string | number) =>
    `모둠 ${size}명 · 모둠 미션 ${missions}개`,
  deleteConfirm: (title: string) =>
    `「${title}」활동을 삭제할까요?\n연결된 수업 기록·진행 데이터도 함께 삭제되며 되돌릴 수 없습니다.`,
} as const;

export const TEACHER_EDITOR_COPY = {
  createTitle: "활동 만들기",
  editTitle: "활동 수정",
  flowDescription: "활동 안내 → 역할·맞출 아이템·단서 → 모둠 미션 순으로 설계합니다.",
  aiButton: "AI로 초안 만들기",
  steps: {
    basics: { title: "활동 안내", description: "제목·학습 상황 소개" },
    items: { title: "역할·맞출 아이템", description: "역할별 맞출 아이템과 5단계 단서" },
    tasks: { title: "모둠 미션", description: "홈 집단에서 해결할 과제" },
  },
  basicsIntro:
    "학생이 처음 보는 활동 제목과 전체 상황입니다. 모둠 미션의 배경이 됩니다.",
  itemsIntro:
    "모둠 인원만큼 역할을 두고, 역할마다 맞출 아이템과 5단계 단서를 작성합니다. 전문가 집단에서 사용합니다.",
  tasksIntro:
    "홈 집단에서 모둠이 함께 풀 미션입니다. 완료에 필요한 맞출 아이템을 연결합니다.",
  labels: {
    activityTitle: "활동 제목",
    activityDesc: "활동 안내",
    itemName: "맞출 아이템 이름",
    clueStages: "5단계 단서",
    missionTitle: "모둠 미션 제목",
    missionDesc: "모둠 미션 설명",
    requiredItems: "필요한 맞출 아이템",
  },
  placeholders: {
    title: "예: 학교 축제 부스 운영",
    desc: "학습 목표와 활동 상황을 간단히 적어 주세요.",
    itemName: "예: 부스 운영 매뉴얼",
    clue: "단서 문장을 입력하세요.",
    missionTitle: "예: 부스 개점 준비",
    missionDesc: "모둠이 함께 해결할 상황을 적어 주세요.",
  },
  help: {
    requiredItems:
      "선택한 맞출 아이템을 모둠이 모두 모은 뒤, 한 번에 제출해야 모둠 미션을 완료할 수 있습니다.",
  },
  actions: {
    addRole: "역할 추가",
    addClue: "맞출 아이템 추가",
    addMission: "모둠 미션 추가",
    deleteRole: "역할 삭제",
  },
  unnamedItem: (index: number) => `맞출 아이템 ${index + 1} (이름 미입력)`,
  unnamedMission: (index: number) => `모둠 미션 ${index + 1} (미입력)`,
  unnamedLinkedItem: "이름 미지정 맞출 아이템",
} as const;

export const TEACHER_AI_COPY = {
  modalTitle: "AI로 활동 초안 만들기",
  topicLabel: "수업 주제",
  topicHelp: "단원·차시 주제를 적으면 역할·단서·모둠 미션에 반영됩니다.",
  topicPlaceholder: "예: 중2 과학 ‘식물의 구조’, 고1 영어 ‘환경 보호’",
  difficultyLabel: "난이도",
  difficultyHelp: "저장되지 않습니다. 단서·모둠 미션 난이도 조절에만 사용합니다.",
  languageLabel: "콘텐츠 언어",
  roleCountLabel: "역할 수",
  roleCountHelp: "모둠 인원과 같습니다. 역할당 맞출 아이템 1개",
  missionCountLabel: "모둠 미션 수",
  missionCountHelp: "홈 집단에서 해결할 과제 수",
  generate: "활동 초안 생성",
  generating: "생성 중…",
  generateFailed: "생성에 실패했습니다.",
} as const;

export const TEACHER_REPORTS_COPY = {
  pageTitle: "수업 기록",
  listDescription: "진행한 수업별 모둠 미션·점수를 확인합니다.",
  detailDescription: "이 수업의 모둠 미션 진행과 점수를 확인합니다.",
  empty: "아직 진행한 수업이 없습니다.",
  emptyLink: "내 활동",
  emptyAction: "에서 수업을 시작해 주세요.",
  viewSummary: "요약 보기",
  backToList: "← 수업 목록",
  deleteConfirm: (title: string) =>
    `「${title}」수업 기록을 삭제할까요?\n모둠·참가 데이터가 삭제되며 되돌릴 수 없습니다. 활동 원본은 유지됩니다.`,
  loadError: "수업 기록을 불러오지 못했습니다.",
  forbidden: "이 수업 기록을 볼 권한이 없습니다.",
} as const;

export const TOP_NAV_COPY = {
  studentEntry: "학생 입장",
  teacherLogin: "교사 로그인",
  signOut: "로그아웃",
} as const;

export const HOST_SESSION_START_LABEL = HOST_COPY.startSession;

export function hostSessionNextPhaseLabel(phase: ActivityPhase): string {
  const next = getNextPhase(phase);
  if (!next) return "—";
  return next === "results" ? HOST_COPY.viewResults : HOST_COPY.nextPhase;
}
