/**
 * Jigsaw 활동 팩 생성 — POST /api/ai/generate-activity-pack
 */

import { NextRequest, NextResponse } from "next/server";

import { normalizeAiDifficulty } from "@/lib/activity-pack/ai-difficulty";
import type { ContentLanguage } from "@/lib/activity-pack/content-language";
import { DEFAULT_CONTENT_LANGUAGE } from "@/lib/activity-pack/content-language";
import { loadActivityPack } from "@/lib/activity-pack/parse";
import type { ActivityPack } from "@/lib/activity-pack/types";
import { ACTIVITY_PACK_VERSION } from "@/lib/activity-pack/types";

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

const ACTIVITY_PACK_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["title", "description", "groupSize", "roles"],
  properties: {
    title: { type: "string" },
    description: { type: "string" },
    groupSize: { type: "integer" },
    roles: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "segment", "keyPoints", "practiceQuestions", "testQuestions"],
        properties: {
          id: { type: "string" },
          segment: { type: "string" },
          keyPoints: { type: "array", items: { type: "string" } },
          practiceQuestions: {
            type: "array",
            items: PRACTICE_QUESTION_SCHEMA,
          },
          testQuestions: {
            type: "array",
            items: TEST_QUESTION_SCHEMA,
          },
        },
      },
    },
  },
} as const;

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function buildSystemPrompt(contentLanguage: ContentLanguage): string {
  const introRule =
    contentLanguage === "ko"
      ? "- title: Korean, 4–20 characters or short phrase, matching the activity theme.\n- description: Korean activity introduction, 2–4 sentences for teachers/students."
      : "- title: English, 4–12 words, matching the activity theme.\n- description: English activity introduction, 2–4 sentences for teachers/students.";

  const contentLanguageRule =
    contentLanguage === "ko"
      ? "- All learning content in Korean: role segments, keyPoints, question prompts, choices, hints, and explanations."
      : "- All learning content in English: role segments, keyPoints, question prompts, choices, hints, and explanations.";

  return [
    `You design STAD-based jigsaw cooperative classroom activities for the 'Jigsaw' teacher platform.`,
    `Flow: (1) Expert groups — each role masters one passage and solves multiple PRACTICE questions (3 tries each, hints); base score = average of per-question scores. (2) Home group — teach using everyone's segment and practice questions (no submission). (3) Individual formative test — all TEST questions across roles, one attempt only; test score = round(correct/total*100); STAD improvement points.`,
    "",
    "Output JSON only.",
    "",
    "Rules:",
    introRule,
    contentLanguageRule,
    "- groupSize: must equal roles.length (2–12).",
    "- roles: each has id (snake_case ASCII), segment (2–4 sentences), keyPoints (2–3 bullets), practiceQuestions (array, 1–3 items), testQuestions (array, 1–3 items). Role display names are auto-assigned at play time.",
    "- Split the whole content so every role's segment is a distinct, complementary part; together they cover the full topic.",
    "- practiceQuestions (expert): each MCQ about that role's segment, with `hints` (exactly 2 strings for wrong attempts 1 and 2) and `explanation` on reveal.",
    "- testQuestions (formative): MCQs about that role's segment; pooled across all roles for the one-time test.",
    "- Every question: prompt, choices (3–4 plausible options), correctIndex (0-based index of the correct choice). Exactly one correct choice.",
    "- All questions are multiple-choice only. Do NOT use short-answer, ordering by typing, or matching formats.",
    "- No violence, culturally appropriate for Korean middle/high school.",
  ].join("\n");
}

function buildUserPrompt(opts: {
  topic: string;
  difficulty?: string;
  roleCount: number;
  contentLanguage: ContentLanguage;
}): string {
  const lines = [
    `Generate one complete STAD jigsaw activity pack JSON following the schema.`,
    `Create exactly ${opts.roleCount} roles. Each role: segment, 2–3 keyPoints, 1–2 practiceQuestions (each with 2 hints + explanation), 1–2 testQuestions.`,
    `All questions multiple-choice with exactly one correct answer.`,
    `Content language for everything: ${opts.contentLanguage === "ko" ? "Korean" : "English"}.`,
  ];
  if (opts.difficulty) {
    lines.push(
      `Calibrate segment and question difficulty for ${opts.difficulty} level (do not output a difficulty field).`,
    );
  }
  if (opts.topic.trim()) {
    lines.push("", "Activity topic:", opts.topic.trim());
  } else {
    lines.push("", "Activity topic: textbook-based cooperative learning (e.g. middle school English unit 'Save Our Planet').");
  }
  return lines.join("\n");
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
  const topic = typeof input.topic === "string" ? input.topic : "";
  const difficulty = normalizeAiDifficulty(input.difficulty);
  const roleCount = clamp(
    typeof input.roleCount === "number"
      ? Math.floor(input.roleCount)
      : typeof input.groupSize === "number"
        ? Math.floor(input.groupSize)
        : 4,
    2,
    12,
  );
  const contentLanguage: ContentLanguage =
    input.contentLanguage === "en" || input.contentLanguage === "ko"
      ? input.contentLanguage
      : DEFAULT_CONTENT_LANGUAGE;

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
        temperature: 0.85,
        messages: [
          { role: "system", content: buildSystemPrompt(contentLanguage) },
          {
            role: "user",
            content: buildUserPrompt({
              topic,
              difficulty,
              roleCount,
              contentLanguage,
            }),
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "activity_pack",
            strict: true,
            schema: ACTIVITY_PACK_SCHEMA,
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
    const pack = loadActivityPack({
      ...(parsed as Record<string, unknown>),
      version: ACTIVITY_PACK_VERSION,
    }) satisfies ActivityPack;
    return NextResponse.json(pack);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "정규화 실패";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
