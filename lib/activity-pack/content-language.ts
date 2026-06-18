/** AI 생성 시 콘텐츠 언어 */

export type ContentLanguage = "ko" | "en";

export const DEFAULT_CONTENT_LANGUAGE: ContentLanguage = "ko";

export const CONTENT_LANGUAGE_OPTIONS: ReadonlyArray<{
  value: ContentLanguage;
  label: string;
}> = [
  { value: "ko", label: "한국어" },
  { value: "en", label: "영어" },
];
