/**
 * Zigso + STAD 활동 팩(ActivityPack) 데이터 모델.
 * 직소 4단계 흐름:
 *   1) 역할 맡기 — 모둠·역할(학습 분량) 확인
 *   2) 깊게 파고들기 — 역할별 내용 마스터 + 연습 문제(3회·힌트), 평균이 기준 점수
 *   3) 서로 알려주기 — 모둠원 지문·연습을 보며 설명(제출 없음)
 *   4) 실력 확인하기 — 모든 역할 실전 문제 1회, 향상도로 STAD 개인·집단 점수
 */

export const ACTIVITY_PACK_VERSION = 5 as const;

/** 객관식 문항 — 모든 문제는 객관식 */
export type QuizQuestion = {
  id: string;
  /** 문제 지문 */
  prompt: string;
  /** 보기 (2개 이상) */
  choices: string[];
  /** 정답 보기 인덱스 (0-based) */
  correctIndex: number;
  /** 오답 시 단계별 스캐폴딩 힌트 (연습 문제용) */
  hints: string[];
  /** 정답 공개 시 보여줄 해설 */
  explanation: string;
};

/**
 * 역할당 연습 문항 결과 (저장·집계용).
 * 점수는 `wrongAttempts`에서 항상 파생되므로 따로 저장하지 않는다 (practiceBaseScore).
 */
export type PracticeQuestionResult = {
  questionId: string;
  wrongAttempts: number;
  wrongChoices?: number[];
};

/** 홈 모둠 역할 — 전문가가 마스터하는 지문 조각 + 연습/실전 문제(각 여러 개) */
export type Role = {
  id: string;
  /** 표시용 코드명 (정답 노출 방지) */
  name: string;
  /** 2단계에서 맡아 마스터하는 학습 내용 */
  segment: string;
  /** 2단계 연습 문제 (3회·힌트) → 기준 점수는 문항 점수 평균 */
  practiceQuestions: QuizQuestion[];
  /** 4단계 실전 문제 (1회만 응시) */
  testQuestions: QuizQuestion[];
};

export type ActivityPack = {
  version: typeof ACTIVITY_PACK_VERSION;
  title: string;
  description: string;
  roles: Role[];
};

/** 형성평가 응답 — 문항 id별 선택한 보기 인덱스 */
export type QuizAnswer = {
  questionId: string;
  choiceIndex: number;
};
