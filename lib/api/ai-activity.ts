import type { AiDifficultyLevel } from "@/lib/activity-pack/ai-difficulty";
import type { ContentLanguage } from "@/lib/activity-pack/content-language";
import type { ActivityPack } from "@/lib/activity-pack/types";

/**
 * POST /api/ai/generate-activity-pack — Jigsaw 활동 팩 생성
 */

export type AIActivityRequest = {
  topic?: string;
  difficulty?: AiDifficultyLevel;
  /** 맞출 항목(역할) 수 — 모둠 인원과 동일하게 적용됩니다 */
  roleCount?: number;
  taskCount?: number;
  /** 제목·활동 안내·힌트·수행 문장 언어 */
  contentLanguage?: ContentLanguage;
};

export type AIActivityResponse = ActivityPack;

export async function generateActivityPackWithAI(
  body: AIActivityRequest,
): Promise<AIActivityResponse> {
  const res = await fetch("/api/ai/generate-activity-pack", {
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
  return (await res.json()) as AIActivityResponse;
}
