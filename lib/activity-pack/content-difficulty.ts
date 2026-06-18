/** AI 학습 내용 생성 시 난이도 */

export type ContentDifficulty = "high" | "medium" | "low";

export const DEFAULT_CONTENT_DIFFICULTY: ContentDifficulty = "medium";

export const CONTENT_DIFFICULTY_OPTIONS: ReadonlyArray<{
  value: ContentDifficulty;
  label: string;
}> = [
  { value: "high", label: "상" },
  { value: "medium", label: "중" },
  { value: "low", label: "하" },
];
