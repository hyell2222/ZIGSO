import type { EnglishLevel } from "@/lib/lunch/types";

export type BriefingLanguage = "ko" | "en";

export const ENGLISH_LEVEL_OPTIONS: Array<{
  value: EnglishLevel;
  label: string;
  description: string;
}> = [
  { value: "A1", label: "A1 · 입문", description: "기초 단어, 짧은 문장" },
  { value: "A2", label: "A2 · 기초", description: "일상 표현, 간단한 문장" },
  { value: "B1", label: "B1 · 중급", description: "설명·비교가 있는 문장" },
  { value: "B2", label: "B2 · 중상급", description: "자연스러운 구어·추상 어휘" },
];

export const BRIEFING_LANGUAGE_OPTIONS: Array<{
  value: BriefingLanguage;
  label: string;
  description: string;
}> = [
  {
    value: "ko",
    label: "한국어",
    description: "제목·수업 안내는 한국어, 힌트·조리·정답은 영어",
  },
  {
    value: "en",
    label: "영어",
    description: "제목·수업 안내까지 모두 영어로 생성",
  },
];

export const DEFAULT_BRIEFING_LANGUAGE: BriefingLanguage = "ko";

export function englishLevelLabel(level: EnglishLevel): string {
  return ENGLISH_LEVEL_OPTIONS.find((o) => o.value === level)?.label ?? level;
}
