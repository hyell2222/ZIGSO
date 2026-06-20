import type { QuizQuestion } from "@/lib/activity-pack/types";

export type ContentDifficulty = "easy" | "normal" | "hard" | string;
export type ContentLanguage = "ko" | "en" | string;

export type ContentLength = "short" | "medium" | "long";

/** POST /api/ai/generate-learning-content — 학습 주제 기반 학습 내용 생성 */

export type AILearningContentRequest = {
  topic: string;
  activityTitle?: string;
  achievementStandard?: string;
  contentLanguage?: ContentLanguage;
  difficulty?: ContentDifficulty;
  length?: ContentLength;
};

export type AILearningContentResponse = {
  segment: string;
  length?: ContentLength;
};

export type AIRoleQuestionsRequest = {
  segment: string;
  activityTitle?: string;
  kind: "practice" | "test";
  questionCount?: number;
  contentLanguage?: ContentLanguage;
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

function parseAILearningContentResponse(
  json: unknown,
): AILearningContentResponse {
  if (!json || typeof json !== "object" || !("segment" in json)) {
    throw new Error("AI 응답 형식이 올바르지 않습니다.");
  }

  const segment = String((json as { segment?: unknown }).segment ?? "").trim();

  if (!segment) {
    throw new Error("생성된 학습 내용이 없습니다.");
  }

  const length = (json as { length?: unknown }).length;

  return {
    segment,
    length:
      length === "short" || length === "medium" || length === "long"
        ? length
        : undefined,
  };
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

export async function generateLearningContentWithAI(
  body: AILearningContentRequest,
): Promise<AILearningContentResponse> {
  const res = await fetch("/api/ai/generate-learning-content/", {
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
  return parseAILearningContentResponse(json);
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