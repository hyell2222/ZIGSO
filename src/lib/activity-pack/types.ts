/**
 * ZIGSO + STAD 활동 팩(ActivityPack) 데이터 모델.
 * 직소 4단계 흐름:
 *   1) 모둠 · 역할 정하기 — 모둠·역할 확인
 *   2) 전문가 되기 — 역할별 내용 학습 + 연습 문제(3회·힌트), 평균이 기준 점수
 *   3) 서로 알려주기 — 모둠원 내용·연습을 보며 설명(제출 없음)
 *   4) 실력 확인하기 — 모든 역할 실전 문제 1회, 향상도로 STAD 개인·집단 점수
 */


/** 객관식 문항 — 모든 문제는 객관식 */
export type QuizQuestion = {
  id: string;
  /** 문제 내용 */
  prompt: string;
  /** 보기 (2개 이상) */
  choices: string[];
  /** 정답 보기 인덱스 (0-based) */
  correctIndex: number;
};

/**
 * 역할당 연습 문항 결과 (저장·집계용).
 * 점수는 `wrongAttempts`에서 항상 파생되므로 따로 저장하지 않는다 (practiceBaseScore).
 */
export type PracticeQuestionResult = {
  questionId: string;
  wrongAttempts: number;
  wrongChoices?: number[];
  viewedHint1?: boolean;
  viewedHint2?: boolean;
};

/** 홈 모둠 역할 — 전문가가 마스터하는 내용 조각 + 연습/실전 문제(각 여러 개) */
export type Role = {
  id: string;
  /** 2단계에서 맡아 마스터하는 학습 내용 */
  segment: string;
  /** 2단계 연습 문제 (3회·힌트) → 기준 점수는 문항 점수 평균 */
  practiceQuestions: QuizQuestion[];
};

export type ActivityPack = {
  roles: Role[];
  /** 4단계 실전 문제 (1회만 응시) — 활동 전체에 대한 종합 형성평가 */
  testQuestions: QuizQuestion[];
};

/** 형성평가 응답 — 문항 id별 선택한 보기 인덱스 */
export type QuizAnswer = {
  questionId: string;
  choiceIndex: number;
};
