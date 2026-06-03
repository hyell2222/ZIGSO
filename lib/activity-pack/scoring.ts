/**
 * STAD 점수 계산.
 * - 기준 점수(base): 역할 연습 문항별 점수(3회 기회, 오답마다 -30)의 평균
 * - 실전 점수(test): (맞힌 실전 문항 수 ÷ 전체 실전 문항 수) × 100, 반올림
 * - 개인 점수(improvement): 기준 점수 대비 향상도를 STAD 향상점수표로 환산(0~30)
 */

/** 연습 문제 최고 점수 */
export const PRACTICE_MAX_SCORE = 100;
/** 연습 문제 오답 1회당 차감 점수 */
export const PRACTICE_WRONG_PENALTY = 30;
/** 연습 문제 최대 시도 횟수 */
export const PRACTICE_MAX_ATTEMPTS = 3;

/** 오답 횟수 → 문항 점수 (100/70/40/10, 최저 0) */
export function practiceBaseScore(wrongAttempts: number): number {
  const wrong = Math.max(0, Math.min(PRACTICE_MAX_ATTEMPTS, Math.floor(wrongAttempts)));
  return Math.max(0, PRACTICE_MAX_SCORE - wrong * PRACTICE_WRONG_PENALTY);
}

/** 연습 문항 점수들 → 기준 점수(평균, 반올림) */
export function averagePracticeBaseScore(scores: number[]): number {
  if (scores.length === 0) return 0;
  const sum = scores.reduce((s, n) => s + Math.max(0, Math.round(n)), 0);
  return Math.round(sum / scores.length);
}

/**
 * 실전 점수(%) — (맞힌 수 ÷ 전체) × 100, 소수점 첫째 자리에서 반올림(정수 %).
 * 실전 문제는 재응시 없음(연습과 달리 1회 제출).
 */
export function testPercent(correct: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((Math.max(0, correct) / total) * 100);
}

/**
 * STAD 향상 점수표 — 기준 점수 대비 실전 점수 차이를 0~30점으로 환산.
 * 연습·실전 모두 100점이면 차이가 0이어도 향상 점수 30점(만점)을 줍니다.
 */
export function stadImprovementPoints(baseScore: number, testScore: number): number {
  const base = Math.max(0, Math.round(baseScore));
  const test = Math.max(0, Math.round(testScore));
  const diff = test - base;

  if (base >= 100 && test >= 100) return 30;

  if (diff <= -11) return 5;
  if (diff <= -1) return 10;
  if (diff <= 10) return 20;
  return 30;
}
