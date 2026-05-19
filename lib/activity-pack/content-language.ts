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
    description: "제목·활동 안내·단서·수행 문장 모두 한국어",
  },
  {
    value: "en",
    label: "영어",
    description: "제목·활동 안내·단서·수행 문장 모두 영어",
  },
];

export const DEFAULT_CONTENT_LANGUAGE: ContentLanguage = "ko";
