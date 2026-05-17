export function normalizeSentence(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

export function scoreForHintLevel(level: 1 | 2 | 3 | 4 | 5): number {
  return 6 - level;
}
