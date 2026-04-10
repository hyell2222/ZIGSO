/** Player `/play` 화면에서 세션 `phase` 문자열을 어떤 UI로 연결할지 구분합니다. */

export type InvestigationPhase = "first_investigation" | "second_investigation";

export function isInvestigationPhase(phase: string | null): phase is InvestigationPhase {
  return phase === "first_investigation" || phase === "second_investigation";
}

export function investigationPhaseLabel(phase: InvestigationPhase): string {
  return phase === "first_investigation" ? "1차 현장" : "2차 현장";
}
