import {
  PRACTICE_MAX_ATTEMPTS,
  practiceBaseScore,
  stadImprovementPoints,
  testPercent,
} from "@/lib/activity-pack/scoring";

export type StadScoreSnapshot = {
  baseScore: number;
  testScore: number;
  improvementPoints: number;
};

export function buildStadScoreSnapshot(
  baseScore: number | null | undefined,
  correctCount: number,
  total: number,
): StadScoreSnapshot {
  const base = Math.max(0, Math.round(baseScore ?? 0));
  const testScore = testPercent(correctCount, total);
  const improvementPoints = stadImprovementPoints(base, testScore);
  return {
    baseScore: base,
    testScore,
    improvementPoints,
  };
}

/** 연습 문항 점수표 — 오답 횟수별 문항 점수 */
export const PRACTICE_SCORE_TABLE = Array.from({ length: PRACTICE_MAX_ATTEMPTS + 1 }, (_, wrong) => ({
  wrongAttempts: wrong,
  points: practiceBaseScore(wrong),
}));

/** STAD 향상 점수표 행 — 실전 점수 − 기준 점수(%) 차이 기준 */
export const STAD_IMPROVEMENT_TABLE = [
  { condition: "연습·실전 모두 100점", points: 30 },
  { condition: "−11 이하", points: 5 },
  { condition: "−10 ~ −1", points: 10 },
  { condition: "0 ~ +10", points: 20 },
  { condition: "+11 이상", points: 30 },
] as const;
