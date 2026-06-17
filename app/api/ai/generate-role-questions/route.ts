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

const MIN_CHOICES = 3;
const MAX_CHOICES = 4;
const MAX_QUESTION_COUNT = 4;
const MAX_EXISTING_QUESTIONS = 20;

const PRACTICE_QUESTION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["prompt", "choices", "correctIndex", "hints", "explanation"],
  properties: {
    prompt: { type: "string" },
    choices: {
      type: "array",
      minItems: MIN_CHOICES,
      maxItems: MAX_CHOICES,
      items: { type: "string" },
    },
    correctIndex: { type: "integer", minimum: 0, maximum: MAX_CHOICES - 1 },
    hints: {
      type: "array",
      minItems: 2,
      maxItems: 2,
      items: { type: "string" },
    },
    explanation: { type: "string" },
  },
} as const;

const TEST_QUESTION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["prompt", "choices", "correctIndex"],
  properties: {
    prompt: { type: "string" },
    choices: {
      type: "array",
      minItems: MIN_CHOICES,
      maxItems: MAX_CHOICES,
      items: { type: "string" },
    },
    correctIndex: { type: "integer", minimum: 0, maximum: MAX_CHOICES - 1 },
  },
} as const;

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function uniqNonEmptyStrings(values: unknown[], limit = 100): string[] {
  return Array.from(
    new Set(
      values
        .map((v) => (typeof v === "string" ? v.trim() : ""))
        .filter(Boolean),
    ),
  ).slice(0, limit);
}

function getLanguageRule(contentLanguage: ContentLanguage): string {
  return contentLanguage === "ko"
    ? "All question content MUST be written in Korean: prompts, choices, hints, explanations."
    : "All question content MUST be written in English: prompts, choices, hints, explanations.";
}

const READING_DEPTH_RULES = [
  "Question quality rules (CORE COMPREHENSION FOCUS):",
  "- Focus on the CORE message, main narrative arc, critical events, and logical flow (cause-and-effect, problem-solution) of the segment.",
  "- Do NOT ask for isolated facts (e.g., specific years, names, numbers) or simple vocabulary lookups that miss the bigger picture.",
  "- Avoid lazy prompt formats like 'Which of the following is true/false?' or 'What is mentioned?'. Instead, ask specific, context-rich questions (e.g., 'What was the primary reason for...', 'What is the main impact of...', 'Why did the author mention...').",
  "- Distractors (wrong choices) MUST be high-quality: use partial truths, reversed cause-and-effect, overgeneralizations, or plausible misconceptions derived from the text. They should not be obviously silly or irrelevant.",
  "- The correct answer must clearly demonstrate a true understanding of the text's central point or critical context.",
  "- Keep the language of the prompt and choices concise, clear, and unambiguous.",
].join("\n");

function buildSetLabel(kind: "practice" | "test") {
  return kind === "practice" ? "PRACTICE" : "FORMATIVE TEST";
}

function buildDistinctnessRule(kind: "practice" | "test"): string {
  const setLabel = buildSetLabel(kind);
  const otherSetLabel = kind === "practice" ? "formative test" : "practice";

  return [
    `Distinctness rules — ${setLabel} set ONLY:`,
    `- You are writing for the ${setLabel} question pool of this role segment.`,
    `- The ${otherSetLabel} pool is a completely separate set. It is NOT provided and must NOT influence your question.`,
    `- Compare ONLY against existing ${setLabel} questions listed in this request (if any).`,
    `- Treat as DUPLICATE (forbidden) if the new question matches ANY listed question in ANY of these ways:`,
    "  • same question intent or same reading-comprehension skill being tested",
    "  • same main idea, fact, relationship, or inference target",
    "  • same correct-answer concept (even with different wording)",
    "  • same focus on the same sentence, paragraph, or detail in the segment",
    "  • obvious paraphrase or minor rewording of a listed prompt or answer idea",
    `- Each new ${setLabel} question MUST probe a different sub-topic, angle, or skill from every listed question.`,
    `- Rotate comprehension angles across questions: inference, cause-effect, purpose, comparison, application, problem-solution, condition-result, best summary.`,
    `- If several ${setLabel} questions already exist, deliberately choose the least-covered part of the segment.`,
  ].join("\n");
}

function buildVarietyRule(kind: "practice" | "test"): string {
  const setLabel = buildSetLabel(kind);

  return [
    `Variety rules — ${setLabel} set:`,
    `- When generating multiple questions in one response, every question must be mutually distinct under the distinctness rules above.`,
    `- Never reuse the same correct-answer idea across questions in this response.`,
    `- Spread questions across different portions or ideas in the segment when possible.`,
  ].join("\n");
}

function buildSystemPrompt(kind: "practice" | "test", contentLanguage: ContentLanguage): string {
  const langRule = getLanguageRule(contentLanguage);
  const distinctnessRule = buildDistinctnessRule(kind);
  const varietyRule = buildVarietyRule(kind);

  if (kind === "practice") {
    return [
      "You write multiple-choice PRACTICE reading-comprehension questions for a jigsaw expert-group segment.",
      "Output JSON only.",
      langRule,
      "",
      "Required format for each practice question:",
      "- prompt: one clear reading-comprehension question.",
      "- choices: 3–4 answer choices.",
      "- correctIndex: 0-based index of the only correct choice.",
      "- hints: exactly 2 strings. Hint 1 should gently guide; Hint 2 should be more specific but must not reveal the answer directly.",
      "- explanation: concise explanation of why the correct answer is right and why the key misunderstanding is wrong.",
      "",
      "Content rules:",
      "- Questions must test understanding of the given segment only.",
      "- Exactly one correct choice per question.",
      "- You are filling the PRACTICE set only. Do not imitate or avoid formative test questions; that other set is irrelevant here.",
      READING_DEPTH_RULES,
      distinctnessRule,
      varietyRule,
    ].join("\n");
  }

  return [
    "You write multiple-choice FORMATIVE TEST reading-comprehension questions for a jigsaw expert-group segment.",
    "Output JSON only.",
    langRule,
    "",
    "Required format for each test question:",
    "- prompt: one clear reading-comprehension question.",
    "- choices: 3–4 answer choices.",
    "- correctIndex: 0-based index of the only correct choice.",
    "- Do not include hints or explanations.",
    "",
    "Content rules:",
    "- Questions must test understanding of the given segment only.",
    "- Exactly one correct choice per question.",
    "- You are filling the FORMATIVE TEST set only. Do not imitate or avoid practice questions; that other set is irrelevant here.",
    READING_DEPTH_RULES,
    distinctnessRule,
    varietyRule,
  ].join("\n");
}

function buildUserPrompt(opts: {
  segment: string;
  activityTitle: string;
  kind: "practice" | "test";
  questionCount: number;
  contentLanguage: ContentLanguage;
  existingQuestions: string[];
}): string {
  const setLabel = buildSetLabel(opts.kind);
  const lines = [
    `Generate exactly ${opts.questionCount} ${opts.kind === "practice" ? "practice" : "formative test"} question(s) as JSON.`,
    `Target pool: ${setLabel} questions for this role segment.`,
    `Content language: ${opts.contentLanguage === "ko" ? "Korean" : "English"}.`,
    "",
    `IMPORTANT: Only avoid duplication within the ${setLabel} pool listed below (if any).`,
    `Do NOT consider ${opts.kind === "practice" ? "formative test" : "practice"} questions — they are a separate set and not shown here.`,
  ];

  if (opts.activityTitle.trim()) {
    lines.push("", "Activity title:", opts.activityTitle.trim());
  }

  lines.push("", "Learning content:", opts.segment.trim());

  if (opts.existingQuestions.length > 0) {
    lines.push(
      "",
      `Existing ${setLabel} questions in this role — your output MUST NOT overlap with ANY of these:`,
      ...opts.existingQuestions.map((q, i) => `${i + 1}. ${q}`),
      "",
      `Before finalizing, verify the new question(s):`,
      `- test a different concept/skill than every item above`,
      `- use a different comprehension angle than every item above`,
      `- would not share the same correct-answer idea as any item above`,
    );
  } else {
    lines.push("", `No existing ${setLabel} questions yet — this is the first question in this pool.`);
  }

  // --- 개선된 Reminder 부분 ---
  lines.push(
    "",
    "Reminder for Core Comprehension:",
    "- Identify the EXACT CORE of the text. What is the most important concept or takeaway the reader must learn?",
    "- Ensure your questions test the *understanding* of this core message, not visual scanning or memory of trivia.",
    `- Within the ${setLabel} pool, every question must stand alone as a meaningful and highly relevant assessment of the segment.`,
  );

  return lines.join("\n");
}

function buildSchema(kind: "practice" | "test", questionCount: number) {
  const itemSchema = kind === "practice" ? PRACTICE_QUESTION_SCHEMA : TEST_QUESTION_SCHEMA;

  return {
    type: "object",
    additionalProperties: false,
    required: ["questions"],
    properties: {
      questions: {
        type: "array",
        minItems: questionCount,
        maxItems: questionCount,
        items: itemSchema,
      },
    },
  } as const;
}

function normalizeHints(rawHints: unknown): string[] {
  const hints = Array.isArray(rawHints)
    ? rawHints.map((h) => String(h).trim()).filter(Boolean)
    : [];

  const normalized = hints.slice(0, 2);

  while (normalized.length < 2) {
    normalized.push("지문에서 핵심 관계를 다시 확인해 보세요.");
  }

  return normalized;
}

function normalizeQuestions(raw: unknown, kind: "practice" | "test"): QuizQuestion[] {
  const list = (raw as { questions?: unknown }).questions;

  if (!Array.isArray(list)) {
    throw new Error("questions 배열이 없습니다.");
  }

  return list
    .map((item, i) => {
      const q = item as Record<string, unknown>;

      const prompt = String(q.prompt ?? "").trim();
      const choices = Array.isArray(q.choices)
        ? uniqNonEmptyStrings(q.choices, MAX_CHOICES)
        : [];

      if (!prompt || choices.length < MIN_CHOICES) {
        return null;
      }

      const rawCorrectIndex = typeof q.correctIndex === "number" ? Math.floor(q.correctIndex) : 0;
      const correctIndex =
        rawCorrectIndex >= 0 && rawCorrectIndex < choices.length ? rawCorrectIndex : 0;

      const base: QuizQuestion = {
        id: `ai_${kind}_${Date.now()}_${i + 1}`,
        prompt,
        choices,
        correctIndex,
        hints: [],
        explanation: "",
      };

      if (kind === "practice") {
        return {
          ...base,
          hints: normalizeHints(q.hints),
          explanation: String(q.explanation ?? "").trim(),
        };
      }

      return base;
    })
    .filter((q): q is QuizQuestion => q !== null);
}

function getOpenAIErrorText(text: string) {
  if (!text) return "";

  try {
    const parsed = JSON.parse(text) as {
      error?: { message?: string; type?: string; code?: string };
    };

    const message = parsed.error?.message;
    const type = parsed.error?.type;
    const code = parsed.error?.code;

    return [message, type && `type=${type}`, code && `code=${code}`].filter(Boolean).join(" / ");
  } catch {
    return text.slice(0, 500);
  }
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

  const kind: "practice" | "test" = input.kind === "test" ? "test" : "practice";

  const activityTitle = typeof input.activityTitle === "string" ? input.activityTitle.trim() : "";

  const questionCount = clamp(
    typeof input.questionCount === "number" ? Math.floor(input.questionCount) : 1,
    1,
    MAX_QUESTION_COUNT,
  );

  const contentLanguage: ContentLanguage =
    input.contentLanguage === "en" || input.contentLanguage === "ko"
      ? input.contentLanguage
      : DEFAULT_CONTENT_LANGUAGE;

  const existingQuestions = Array.isArray(input.existingQuestions)
    ? uniqNonEmptyStrings(input.existingQuestions, MAX_EXISTING_QUESTIONS)
    : [];

  const schema = buildSchema(kind, questionCount);

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
        temperature: 0.65,
        messages: [
          {
            role: "system",
            content: buildSystemPrompt(kind, contentLanguage),
          },
          {
            role: "user",
            content: buildUserPrompt({
              segment,
              activityTitle,
              kind,
              questionCount,
              contentLanguage,
              existingQuestions,
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
      {
        error: "OpenAI API 오류",
        detail: getOpenAIErrorText(errText),
      },
      { status: 502 },
    );
  }

  const completion = (await openaiResponse.json()) as {
    choices?: Array<{
      message?: {
        content?: string;
        refusal?: string;
      };
    }>;
  };

  const refusal = completion.choices?.[0]?.message?.refusal;

  if (refusal) {
    return NextResponse.json(
      { error: "AI가 문항 생성을 거절했습니다.", detail: refusal },
      { status: 502 },
    );
  }

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
    const questions = normalizeQuestions(parsed, kind).slice(0, questionCount);

    if (questions.length === 0) {
      return NextResponse.json({ error: "생성된 문항이 없습니다." }, { status: 502 });
    }

    return NextResponse.json({ questions });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "정규화 실패";

    return NextResponse.json({ error: msg }, { status: 502 });
  }
}