/** AI 활동 생성 시 프롬프트 참고용 — 활동·DB에 저장하지 않음 */

export const AI_DIFFICULTY_LEVELS = ["Easy", "Normal", "Hard"] as const;

export type AiDifficultyLevel = (typeof AI_DIFFICULTY_LEVELS)[number];

const LABEL_KO: Record<AiDifficultyLevel, string> = {
  Easy: "쉬움",
  Normal: "보통",
  Hard: "어려움",
};

export const AI_DIFFICULTY_UI_OPTIONS = AI_DIFFICULTY_LEVELS.map((value) => ({
  value,
  label: LABEL_KO[value],
}));

export function normalizeAiDifficulty(value: unknown): AiDifficultyLevel {
  if (typeof value === "string" && (AI_DIFFICULTY_LEVELS as readonly string[]).includes(value)) {
    return value as AiDifficultyLevel;
  }
  return "Normal";
}
