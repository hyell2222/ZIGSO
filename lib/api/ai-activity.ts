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

function formatAIErrorPayload(json: { error?: string; detail?: string }) {
  const parts = [json.error, json.detail].filter(
    (part): part is string => typeof part === "string" && part.trim().length > 0,
  );
  return parts.join(": ");
}

function parseAIQuestionsResponse(json: unknown): AIRoleQuestionsResponse {
  if (!json || typeof json !== "object" || !("questions" in json)) {
    throw new Error("AI 응답 형식이 올바르지 않습니다.");
  }

  const questions = (json as { questions?: unknown }).questions;
  if (!Array.isArray(questions) || questions.length === 0) {
    throw new Error("생성된 문항이 없습니다.");
  }

  return { questions: questions as QuizQuestion[] };
}

export async function generateRoleQuestionsWithAI(
  body: AIRoleQuestionsRequest,
): Promise<AIRoleQuestionsResponse> {
  const res = await fetch("/api/ai/generate-role-questions/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    let message = "";
    try {
      const json = (await res.json()) as { error?: string; detail?: string };
      message = formatAIErrorPayload(json);
    } catch {
      message = await res.text().catch(() => "");
    }
    throw new Error(message || `AI 호출 실패 (HTTP ${res.status})`);
  }

  const json: unknown = await res.json();
  return parseAIQuestionsResponse(json);
}
