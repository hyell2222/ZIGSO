export function normalizeSentence(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

export function scoreForHintLevel(level: 1 | 2 | 3 | 4 | 5): number {
  return 6 - level;
}

export function scoreTaskCompletion(correctSteps: string[], submittedSteps: string[]): number {
  const n = Math.min(correctSteps.length, submittedSteps.length);
  let matches = 0;
  for (let i = 0; i < n; i++) {
    if (normalizeSentence(correctSteps[i]!) === normalizeSentence(submittedSteps[i]!)) {
      matches++;
    }
  }
  return matches * 2;
}
