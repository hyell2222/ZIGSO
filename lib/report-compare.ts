/**
 * 범인만 id 일치로 판정 (용의자 목록에서 선택).
 */
export function isCulpritCorrect(
  answerSuspectId: string | null | undefined,
  submittedSuspectId: string | null | undefined,
): boolean {
  if (answerSuspectId == null || submittedSuspectId == null) return false;
  const a = answerSuspectId.trim();
  const b = submittedSuspectId.trim();
  return a.length > 0 && a === b;
}
