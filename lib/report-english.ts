/**
 * 최종 보고서 자유 서술(수법·동기·결정적 단서) — 영어만 허용.
 * 한글·CJK·가나·키릴 등은 거절하고, 최소 한 글자 이상의 라틴 알파벳(A–Z)을 요구한다.
 */

const NON_ENGLISH_SCRIPTS =
  /[\u3040-\u30FF\u31F0-\u31FF\u4E00-\u9FFF\u3400-\u4DBF\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F\u0400-\u04FF]/;

/** 교실 UI — 최종 보고 양식 안내 */
export const FINAL_REPORT_ENGLISH_HINT =
  "수법·동기·결정적 단서 세 칸은 영어로만 작성합니다. (한글·한자 등 비영어 문자는 제출할 수 없습니다.)";

/** 제출 차단 시 — 서버·클라이언트 공통 */
export const FINAL_REPORT_ENGLISH_ONLY_MESSAGE =
  "수법·동기·결정적 단서는 영어로만 작성할 수 있습니다. 한글·한자·가나·키릴 문자 등은 사용할 수 없으며, A~Z가 포함된 문장이어야 합니다.";

export function containsBlockedNonEnglishScript(text: string): boolean {
  return NON_ENGLISH_SCRIPTS.test(text);
}

/** 서술 필드 1개가 '영어만' 규칙을 통과하는지 */
export function isEnglishOnlyReportNarrative(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (containsBlockedNonEnglishScript(t)) return false;
  if (!/[A-Za-z]/.test(t)) return false;
  return true;
}

/** method / motive / decisiveClue 전부 검사. 통과 시 null, 실패 시 에러 메시지 */
export function validateFinalReportEnglishNarratives(values: {
  method: string;
  motive: string;
  decisiveClue: string;
}): string | null {
  if (!isEnglishOnlyReportNarrative(values.method)) return FINAL_REPORT_ENGLISH_ONLY_MESSAGE;
  if (!isEnglishOnlyReportNarrative(values.motive)) return FINAL_REPORT_ENGLISH_ONLY_MESSAGE;
  if (!isEnglishOnlyReportNarrative(values.decisiveClue)) return FINAL_REPORT_ENGLISH_ONLY_MESSAGE;
  return null;
}
