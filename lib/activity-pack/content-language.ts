/** AI 생성 시 제목·설명·단서·수행 문장 언어 */

export type ContentLanguage = "ko" | "en";

export const CONTENT_LANGUAGE_OPTIONS: Array<{
  value: ContentLanguage;
  label: string;
  description: string;
}> = [
  {
    value: "ko",
    label: "한국어",
    description: "활동 제목·안내·단서·요약문을 한국어로 생성",
  },
  {
    value: "en",
    label: "영어",
    description: "활동 제목·안내·단서·요약문을 영어로 생성",
  },
];

export const DEFAULT_CONTENT_LANGUAGE: ContentLanguage = "ko";
