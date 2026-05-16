/**
 * 재료 추리·메뉴 완성 점수 계산.
 */

/** 힌트 단계별 점수: 1단계=5점 … 5단계=1점 */
export function scoreForHintStage(stage: 1 | 2 | 3 | 4 | 5): number {
  return 6 - stage;
}

export function scoreMenuCompletion(
  correctSteps: string[],
  submittedSteps: string[],
): number {
  if (correctSteps.length === 0) return 0;
  let matched = 0;
  for (let i = 0; i < correctSteps.length; i++) {
    const expected = normalizeSentence(correctSteps[i] ?? "");
    const actual = normalizeSentence(submittedSteps[i] ?? "");
    if (expected && expected === actual) matched++;
  }
  return Math.round((matched / correctSteps.length) * 10);
}

export function normalizeSentence(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[.!?]+$/g, "");
}
