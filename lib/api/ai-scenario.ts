import type { BriefingLanguage } from "@/lib/lunch/english-level";
import type { ScenarioPack } from "@/lib/lunch/types";

/**
 * POST /api/ai/generate-scenario-pack — School Lunch Rush 시나리오 생성
 */

export type AIScenarioRequest = {
  topic?: string;
  difficulty?: "Easy" | "Normal" | "Hard";
  teamSize?: number;
  menuCount?: number;
  englishLevel?: "A1" | "A2" | "B1" | "B2";
  /** 제목·수업 안내 언어 (힌트·조리·정답은 항상 영어) */
  briefingLanguage?: BriefingLanguage;
};

export type AIScenarioResponse = ScenarioPack;

export async function generateScenarioPackWithAI(
  body: AIScenarioRequest,
): Promise<AIScenarioResponse> {
  const res = await fetch("/api/ai/generate-scenario-pack", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let detail = "";
    try {
      const json = (await res.json()) as { error?: string; detail?: string };
      detail = json.error ?? json.detail ?? "";
    } catch {
      detail = await res.text().catch(() => "");
    }
    throw new Error(detail || `AI 호출 실패 (HTTP ${res.status})`);
  }
  return (await res.json()) as AIScenarioResponse;
}

/** @deprecated use generateScenarioPackWithAI */
export const generateLunchPackWithAI = generateScenarioPackWithAI;
