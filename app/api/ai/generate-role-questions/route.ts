/**
 * 학습 내용 기반 연습·실전 문항 생성 — POST /api/ai/generate-role-questions
 */

import { NextRequest, NextResponse } from "next/server";

import type { ContentLanguage } from "@/lib/activity-pack/content-language";
import { DEFAULT_CONTENT_LANGUAGE } from "@/lib/activity-pack/content-language";
import type { QuizQuestion } from "@/lib/activity-pack/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const OPENAI_MODEL = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";

const PRACTICE_QUESTION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["prompt", "choices", "correctIndex", "hints", "explanation"],
  properties: {
    prompt: { type: "string" },
    choices: { type: "array", items: { type: "string" } },
    correctIndex: { type: "integer" },
    hints: { type: "array", items: { type: "string" } },
    explanation: { type: "string" },
  },
} as const;

const TEST_QUESTION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["prompt", "choices", "correctIndex"],
  properties: {
    prompt: { type: "string" },
    choices: { type: "array", items: { type: "string" } },
    correctIndex: { type: "integer" },
  },
} as const;

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function buildSystemPrompt(kind: "practice" | "test", contentLanguage: ContentLanguage): string {
  const langRule =
    contentLanguage === "ko"
      ? "All question content in Korean: prompts, choices, hints, explanations."
      : "All question content in English: prompts, choices, hints, explanations.";

  if (kind === "practice") {
    return [
      "You write multiple-choice PRACTICE questions for a jigsaw expert-group segment.",
      "Output JSON only.",
      langRule,
      "- Each question: prompt, 3–4 choices, correctIndex (0-based), hints (exactly 2 strings for wrong attempts 1 and 2), explanation (shown on reveal).",
      "- Questions must test understanding of the given segment only.",
      "- Exactly one correct choice per question.",
    ].join("\n");
  }

  return [
    "You write multiple-choice FORMATIVE TEST questions for a jigsaw segment.",
    "Output JSON only.",
    langRule,
    "- Each question: prompt, 3–4 choices, correctIndex (0-based). No hints or explanations.",
    "- Questions must test understanding of the given segment only.",
    "- Exactly one correct choice per question.",
  ].join("\n");
}

function buildUserPrompt(opts: {
  segment: string;
  activityTitle: string;
  kind: "practice" | "test";
  questionCount: number;
  contentLanguage: ContentLanguage;
}): string {
  const lines = [
    `Generate exactly ${opts.questionCount} ${opts.kind === "practice" ? "practice" : "test"} questions as JSON.`,
    `Content language: ${opts.contentLanguage === "ko" ? "Korean" : "English"}.`,
  ];
  if (opts.activityTitle.trim()) {
    lines.push("", "Activity title:", opts.activityTitle.trim());
  }
  lines.push("", "Learning content:", opts.segment.trim());
  return lines.join("\n");
}

function normalizeQuestions(raw: unknown, kind: "practice" | "test"): QuizQuestion[] {
  const list = (raw as { questions?: unknown }).questions;
  if (!Array.isArray(list)) {
    throw new Error("questions 배열이 없습니다.");
  }

  return list.map((item, i) => {
    const q = item as Record<string, unknown>;
    const choices = Array.isArray(q.choices)
      ? q.choices.map((c) => String(c).trim()).filter(Boolean)
      : [];
    const correctIndex =
      typeof q.correctIndex === "number" && q.correctIndex >= 0 && q.correctIndex < choices.length
        ? Math.floor(q.correctIndex)
        : 0;
    const base: QuizQuestion = {
      id: `ai_${kind}_${i + 1}`,
      prompt: String(q.prompt ?? "").trim(),
      choices,
      correctIndex,
    };
    if (kind === "practice") {
      const hints = Array.isArray(q.hints)
        ? q.hints.map((h) => String(h).trim()).filter(Boolean)
        : [];
      const explanation = String(q.explanation ?? "").trim();
      return {
        ...base,
        hints: hints.length > 0 ? hints : undefined,
        explanation: explanation || undefined,
      };
    }
    return base;
  });
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY 환경변수가 설정되어 있지 않습니다." },
      { status: 500 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 JSON 입니다." }, { status: 400 });
  }

  const input = body as Record<string, unknown>;
  const segment = typeof input.segment === "string" ? input.segment.trim() : "";
  if (!segment) {
    return NextResponse.json({ error: "학습 내용을 먼저 입력하세요." }, { status: 400 });
  }

  const kind = input.kind === "test" ? "test" : "practice";
  const activityTitle = typeof input.activityTitle === "string" ? input.activityTitle : "";
  const questionCount = clamp(
    typeof input.questionCount === "number" ? Math.floor(input.questionCount) : 1,
    1,
    4,
  );
  const contentLanguage: ContentLanguage =
    input.contentLanguage === "en" || input.contentLanguage === "ko"
      ? input.contentLanguage
      : DEFAULT_CONTENT_LANGUAGE;

  const schema =
    kind === "practice"
      ? {
          type: "object",
          additionalProperties: false,
          required: ["questions"],
          properties: {
            questions: { type: "array", items: PRACTICE_QUESTION_SCHEMA },
          },
        }
      : {
          type: "object",
          additionalProperties: false,
          required: ["questions"],
          properties: {
            questions: { type: "array", items: TEST_QUESTION_SCHEMA },
          },
        };

  let openaiResponse: Response;
  try {
    openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        temperature: 0.75,
        messages: [
          { role: "system", content: buildSystemPrompt(kind, contentLanguage) },
          {
            role: "user",
            content: buildUserPrompt({
              segment,
              activityTitle,
              kind,
              questionCount,
              contentLanguage,
            }),
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "role_questions",
            strict: true,
            schema,
          },
        },
      }),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "OpenAI 연결 실패";
    return NextResponse.json(
      { error: "OpenAI API에 연결할 수 없습니다.", detail: msg },
      { status: 502 },
    );
  }

  if (!openaiResponse.ok) {
    const errText = await openaiResponse.text().catch(() => "");
    return NextResponse.json(
      { error: "OpenAI API 오류", detail: errText.slice(0, 500) },
      { status: 502 },
    );
  }

  const completion = (await openaiResponse.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = completion.choices?.[0]?.message?.content;
  if (!content) {
    return NextResponse.json({ error: "AI 응답이 비어 있습니다." }, { status: 502 });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return NextResponse.json({ error: "AI JSON 파싱 실패" }, { status: 502 });
  }

  try {
    const questions = normalizeQuestions(parsed, kind);
    if (questions.length === 0) {
      return NextResponse.json({ error: "생성된 문항이 없습니다." }, { status: 502 });
    }
    return NextResponse.json({ questions });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "정규화 실패";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
