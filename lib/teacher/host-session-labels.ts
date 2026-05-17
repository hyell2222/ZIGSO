import { getNextPhase } from "@/lib/api/sessions";
import type { ActivityPhase } from "@/lib/types";

/** 실세션·샌드박스 교사 패널 공통 — 대기 단계 시작 버튼 */
export const HOST_SESSION_START_LABEL = "시작하기";

/** 진행 중 다음 단계 버튼 (대기 단계에서는 사용하지 않음) */
export function hostSessionNextPhaseLabel(phase: ActivityPhase): string {
  const next = getNextPhase(phase);
  if (!next) return "—";
  return next === "results" ? "활동 결과" : "다음 단계";
}
