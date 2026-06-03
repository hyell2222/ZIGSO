/**
 * Jigsaw + STAD 활동 팩(ActivityPack) 데이터 모델.
 * 흐름:
 *   1) 전문가 집단 — 역할별 지문 조각을 마스터하고 연습 문제(여러 개)를 풂(3회 기회·힌트).
 *      연습 문항별 점수의 평균이 기준 점수(base score)가 된다.
 *   2) 홈 집단 — 모둠원 모두의 지문·연습 문제를 보며 서로 설명한다(제출 없음).
 *   3) 개별 형성평가 — 모든 역할의 실전 문제(여러 개)를 한 번만 풂.
 *      기준 점수 대비 향상도로 STAD 개인·집단 점수를 계산한다.
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
  /** 오답 시 단계별 스캐폴딩 힌트 (연습 문제용, 선택) */
  hints?: string[];
  /** 정답 공개 시 보여줄 해설 (선택) */
  explanation?: string;
  /** 관련 역할(선택) */
  roleId?: string;
};

/** 역할당 연습 문항 결과 (저장·집계용) */
export type PracticeQuestionResult = {
  questionId: string;
  wrongAttempts: number;
  score: number;
};

/** 홈 모둠 역할 — 전문가가 마스터하는 지문 조각 + 연습/실전 문제(각 여러 개) */
export type Role = {
  id: string;
  /** 표시용 코드명 (정답 노출 방지) */
  name: string;
  /** 전문가가 맡아 마스터하는 지문 조각 */
  segment: string;
  /** 모둠원에게 설명할 핵심 포인트(선택) */
  keyPoints?: string[];
  /** 전문가 집단 연습 문제 (3회 기회·힌트) → 기준 점수는 문항 점수 평균 */
  practiceQuestions: QuizQuestion[];
  /** 개별 형성평가 실전 문제 (1회만 응시) */
  testQuestions: QuizQuestion[];
};

export type ActivityPack = {
  version: typeof ACTIVITY_PACK_VERSION;
  title: string;
  description: string;
  /** 모둠 인원 = 역할 수 */
  groupSize: number;
  roles: Role[];
};

/** 형성평가 응답 — 문항 id별 선택한 보기 인덱스 */
export type QuizAnswer = {
  questionId: string;
  choiceIndex: number;
};
