import type { ContentLanguage } from "@/lib/activity-pack/content-language";
import type { QuizQuestion } from "@/lib/activity-pack/types";

/** POST /api/ai/generate-role-questions — 학습 내용 기반 문항 생성 */

export type AIRoleQuestionsRequest = {
  segment: string;
  activityTitle?: string;
  kind: "practice" | "test";
  questionCount?: number;
  contentLanguage?: ContentLanguage;
  /** 같은 세트의 기존 문항 발문 — 중복 생성을 피하기 위한 컨텍스트 */
  existingQuestions?: string[];
};

export type AIRoleQuestionsResponse = {
  questions: QuizQuestion[];
};

export async function generateRoleQuestionsWithAI(
  body: AIRoleQuestionsRequest,
): Promise<AIRoleQuestionsResponse> {
  const res = await fetch("/api/ai/generate-role-questions/", {
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
  return (await res.json()) as AIRoleQuestionsResponse;
}
