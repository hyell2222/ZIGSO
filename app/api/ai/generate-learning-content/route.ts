/**
 * 학습 주제 기반 학습 내용(세그먼트) 생성 — POST /api/ai/generate-learning-content
 */

import { NextRequest, NextResponse } from "next/server";

import {
  DEFAULT_CONTENT_DIFFICULTY,
  type ContentDifficulty,
} from "@/lib/activity-pack/content-difficulty";
import type { ContentLanguage } from "@/lib/activity-pack/content-language";
import { DEFAULT_CONTENT_LANGUAGE } from "@/lib/activity-pack/content-language";

export const runtime = "nodejs";
export const maxDuration = 60;

const OPENAI_MODEL = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";

const MAX_TOPIC_LENGTH = 500;
const MAX_ACHIEVEMENT_STANDARD_LENGTH = 1000;
const MIN_SEGMENT_LENGTH = 80;
const MAX_SEGMENT_LENGTH = 6000;

type ContentLength = "short" | "medium" | "long";

const DEFAULT_CONTENT_LENGTH: ContentLength = "medium";

const SEGMENT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["segment"],
  properties: {
    segment: {
      type: "string",
      description:
        "A self-contained educational reading passage for zigso expert-group learning.",
    },
  },
} as const;

function getLanguageRule(contentLanguage: ContentLanguage): string {
  return contentLanguage === "ko"
    ? "The entire passage MUST be written in Korean."
    : "The entire passage MUST be written in English.";
}

function getDifficultyRule(difficulty: ContentDifficulty): string {
  switch (difficulty) {
    case "low":
      return [
        "Difficulty: LOW (하).",
        "- Use simple vocabulary and short, clear sentences.",
        "- Target middle-school readers who are still building reading stamina.",
        "- Focus on one main idea with concrete, easy-to-follow examples.",
      ].join("\n");

    case "high":
      return [
        "Difficulty: HIGH (상).",
        "- Use advanced vocabulary, nuanced ideas, and varied sentence structures.",
        "- Target strong high-school or adult learners.",
        "- Include cause-effect relationships, comparisons, or subtle implications worth discussing.",
      ].join("\n");

    default:
      return [
        "Difficulty: MEDIUM (중).",
        "- Use grade-appropriate academic vocabulary and moderately complex sentences.",
        "- Target general high-school readers.",
        "- Present a clear central theme with supporting details students can explain to peers.",
      ].join("\n");
  }
}

function getLengthRule(length: ContentLength): string {
  switch (length) {
    case "short":
      return [
        "Length: SHORT.",
        "- Write about 150–250 English words, or the Korean equivalent.",
        "- Keep the passage concise and focused.",
        "- Use 1–2 paragraphs.",
      ].join("\n");

    case "long":
      return [
        "Length: LONG.",
        "- Write about 450–650 English words, or the Korean equivalent.",
        "- Develop the topic in more depth.",
        "- Use 3–5 paragraphs.",
      ].join("\n");

    default:
      return [
        "Length: MEDIUM.",
        "- Write about 250–400 English words, or the Korean equivalent.",
        "- Provide enough detail for comprehension questions.",
        "- Use 2–3 paragraphs.",
      ].join("\n");
  }
}

function normalizeContentLength(raw: unknown): ContentLength {
  return raw === "short" || raw === "medium" || raw === "long"
    ? raw
    : DEFAULT_CONTENT_LENGTH;
}

function buildSystemPrompt(
  contentLanguage: ContentLanguage,
  difficulty: ContentDifficulty,
  length: ContentLength,
): string {
  return [
    "You write educational reading passages for a zigso cooperative-learning classroom activity.",
    "Each student in an expert group will read and master ONE passage, then teach teammates in a home group.",
    "Output JSON only.",
    getLanguageRule(contentLanguage),
    "",
    getDifficultyRule(difficulty),
    "",
    getLengthRule(length),
    "",
    "Content rules:",
    "- Write a single self-contained passage.",
    "- Do not include a title line, bullet lists, or section headings.",
    "- The text must be factual, age-appropriate, and suitable for school use.",
    "- Include a clear main idea, supporting details, and logical flow.",
    "- Do NOT include quiz questions, vocabulary lists, or meta commentary.",
    "- Do NOT address the reader directly.",
    "- Use paragraph breaks (\\n\\n) between paragraphs when the passage has multiple paragraphs.",
    "- If an achievement standard is provided, align the passage with it naturally without explicitly naming the standard.",
  ].join("\n");
}

function buildUserPrompt(opts: {
  topic: string;
  activityTitle: string;
  achievementStandard: string;
  contentLanguage: ContentLanguage;
  difficulty: ContentDifficulty;
  length: ContentLength;
}): string {
  const lines = [
    "Generate one learning-content passage as JSON.",
    `Topic: ${opts.topic}`,
    `Content language: ${opts.contentLanguage === "ko" ? "Korean" : "English"}.`,
    `Difficulty: ${opts.difficulty}.`,
    `Length: ${opts.length}.`,
  ];

  if (opts.activityTitle.trim()) {
    lines.push("", "Activity title context:", opts.activityTitle.trim());
  }

  if (opts.achievementStandard.trim()) {
    lines.push(
      "",
      "Achievement standard to align with:",
      opts.achievementStandard.trim(),
      "",
      "Use this achievement standard to decide the reading focus, text structure, and thinking skills required.",
      "Do not quote or label the achievement standard directly in the passage.",
    );
  }

  lines.push(
    "",
    "The passage should thoroughly cover the topic so teachers can later create reading-comprehension questions from it.",
  );

  return lines.join("\n");
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

    return [message, type && `type=${type}`, code && `code=${code}`]
      .filter(Boolean)
      .join(" / ");
  } catch {
    return text.slice(0, 500);
  }
}

function normalizeSegment(raw: unknown): string {
  const segment =
    raw && typeof raw === "object" && "segment" in raw
      ? String((raw as { segment?: unknown }).segment ?? "").trim()
      : "";

  if (segment.length < MIN_SEGMENT_LENGTH) {
    throw new Error("생성된 학습 내용이 너무 짧습니다.");
  }

  if (segment.length > MAX_SEGMENT_LENGTH) {
    return segment.slice(0, MAX_SEGMENT_LENGTH).trim();
  }

  return segment;
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

  const topic = typeof input.topic === "string" ? input.topic.trim() : "";

  if (!topic) {
    return NextResponse.json({ error: "학습 주제를 입력하세요." }, { status: 400 });
  }

  if (topic.length > MAX_TOPIC_LENGTH) {
    return NextResponse.json(
      { error: `학습 주제는 ${MAX_TOPIC_LENGTH}자 이내로 입력하세요.` },
      { status: 400 },
    );
  }

  const activityTitle =
    typeof input.activityTitle === "string" ? input.activityTitle.trim() : "";

  const achievementStandard =
    typeof input.achievementStandard === "string"
      ? input.achievementStandard.trim()
      : "";

  if (achievementStandard.length > MAX_ACHIEVEMENT_STANDARD_LENGTH) {
    return NextResponse.json(
      { error: `성취 기준은 ${MAX_ACHIEVEMENT_STANDARD_LENGTH}자 이내로 입력하세요.` },
      { status: 400 },
    );
  }

  const contentLanguage: ContentLanguage =
    input.contentLanguage === "en" || input.contentLanguage === "ko"
      ? input.contentLanguage
      : DEFAULT_CONTENT_LANGUAGE;

  const difficulty: ContentDifficulty =
    input.difficulty === "high" ||
    input.difficulty === "medium" ||
    input.difficulty === "low"
      ? input.difficulty
      : DEFAULT_CONTENT_DIFFICULTY;

  const length = normalizeContentLength(input.length);

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
        temperature: 0.5,
        messages: [
          {
            role: "system",
            content: buildSystemPrompt(contentLanguage, difficulty, length),
          },
          {
            role: "user",
            content: buildUserPrompt({
              topic,
              activityTitle,
              achievementStandard,
              contentLanguage,
              difficulty,
              length,
            }),
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "learning_content",
            strict: true,
            schema: SEGMENT_SCHEMA,
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
      { error: "AI가 학습 내용 생성을 거절했습니다.", detail: refusal },
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
    const segment = normalizeSegment(parsed);

    return NextResponse.json({
      segment,
      length,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "정규화 실패";

    return NextResponse.json({ error: msg }, { status: 502 });
  }
}