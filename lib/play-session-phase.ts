import type { ScenarioPhase } from "@/lib/api/game-sessions";

/** 플레이어가 맵을 띄우는 단계: 단서 수집(investigation) / 최종 미션(resolution) */
export type InvestigationPhase = Extract<ScenarioPhase, "investigation" | "resolution">;

/** 풀스크린 맵 상단 라벨에 표시할 단계명 */
export function investigationPhaseLabel(phase: ScenarioPhase | string | null | undefined) {
  switch (phase) {
    case "investigation":
      return "단서 수집";
    case "resolution":
      return "최종 미션";
    case "briefing":
      return "사건 파악";
    default:
      return "조사";
  }
}
