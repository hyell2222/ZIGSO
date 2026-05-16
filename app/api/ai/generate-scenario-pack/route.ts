/**
 * School Lunch Rush 시나리오 팩 생성 — POST /api/ai/generate-scenario-pack
 */

import { NextRequest, NextResponse } from "next/server";

import { normalizeScenarioPack } from "@/lib/lunch/normalize";
import type { ScenarioPack } from "@/lib/lunch/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

const SCENARIO_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "title",
    "description",
    "difficulty",
    "englishLevel",
    "teamSize",
    "ingredients",
    "menus",
    "commandCards",
  ],
  properties: {
    title: { type: "string" },
    description: { type: "string" },
    difficulty: { type: "string", enum: ["Easy", "Normal", "Hard"] },
    englishLevel: { type: "string", enum: ["A1", "A2", "B1", "B2"] },
    teamSize: { type: "integer" },
    ingredients: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "name", "category", "hints", "cookingHint"],
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          category: {
            type: "string",
            enum: ["staple", "soup", "side", "dessert", "other"],
          },
          hints: {
            type: "object",
            additionalProperties: false,
            required: ["stage1", "stage2", "stage3", "stage4", "stage5"],
            properties: {
              stage1: { type: "string" },
              stage2: { type: "string" },
              stage3: { type: "string" },
              stage4: { type: "string" },
              stage5: { type: "string" },
            },
          },
          cookingHint: { type: "string" },
          aliases: {
            type: "array",
            items: { type: "string" },
          },
        },
      },
    },
    menus: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "name", "slot", "ingredientIds", "cookingSteps"],
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          slot: {
            type: "string",
            enum: ["rice", "soup", "side1", "side2", "side3", "dessert"],
          },
          ingredientIds: {
            type: "array",
            items: { type: "string" },
          },
          cookingSteps: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["order", "sentence"],
              properties: {
                order: { type: "integer" },
                sentence: { type: "string" },
              },
            },
          },
        },
      },
    },
    commandCards: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "text"],
        properties: {
          id: { type: "string" },
          text: { type: "string" },
        },
      },
    },
  },
} as const;

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function buildSystemPrompt(): string {
  return [
    "You design content for 'School Lunch Rush', a cooperative English classroom game.",
    "Students work as cafeteria teams. Each student becomes an ingredient expert (jigsaw), deduces ingredients from 5-stage English hints (hard→easy), returns to the team, and assembles real school lunch menus using English command sentences.",
    "",
    "Output JSON only. All player-facing text must be natural English.",
    "",
    "Rules:",
    "- title: English, 4–12 words, school lunch theme.",
    "- description: English briefing, 2–4 sentences for teachers/students.",
    "- difficulty: Easy | Normal | Hard.",
    "- englishLevel: A1 | A2 | B1 | B2 — match vocabulary and sentence length.",
    "- teamSize: integer 2–12.",
    "- ingredients: each needs id (snake_case ASCII), name (English answer), category (staple|soup|side|dessert|other), hints stage1–stage5 (stage1 hardest, stage5 easiest with letter hint), cookingHint (short English tip for the team kitchen).",
    "- menus: real school lunch dishes. Each menu has unique slot among rice, soup, side1, side2, side3, dessert. ingredientIds must reference ingredient ids. cookingSteps: ordered English imperative sentences.",
    "- commandCards: pool of English imperative cards students can combine; include all cooking step sentences plus a few distractors.",
    "- Cover a full tray when possible: rice + soup + up to 3 sides + dessert.",
    "- No violence, culturally appropriate for Korean middle/high school.",
    "- Hint scoring: stage1=5pts … stage5=1pt — write hints accordingly.",
  ].join("\n");
}

function buildUserPrompt(opts: {
  topic: string;
  difficulty?: string;
  teamSize: number;
  menuCount: number;
  englishLevel: string;
}): string {
  const lines = [
    "Generate one complete lunch scenario JSON following the schema.",
    `Target menus: about ${opts.menuCount} (use slots: rice, soup, side1, side2, side3, dessert where appropriate).`,
    `Team size: ${opts.teamSize} students per team.`,
    `English level: ${opts.englishLevel}.`,
  ];
  if (opts.difficulty) lines.push(`Difficulty: ${opts.difficulty}.`);
  if (opts.topic.trim()) {
    lines.push("", "Lesson topic:", opts.topic.trim());
  } else {
    lines.push("", "Lesson topic: general school cafeteria / food vocabulary.");
  }
  return lines.join("\n");
}

export async function POST(req: NextRequest) {
  if (!OPENAI_API_KEY) {
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
  const difficulty =
    typeof input.difficulty === "string" &&
    ["Easy", "Normal", "Hard"].includes(input.difficulty)
      ? input.difficulty
      : "Normal";
  const teamSize = clamp(
    typeof input.teamSize === "number" ? Math.floor(input.teamSize) : 4,
    2,
    12,
  );
  const menuCount = clamp(
    typeof input.menuCount === "number" ? Math.floor(input.menuCount) : 6,
    1,
    6,
  );
  const englishLevel =
    typeof input.englishLevel === "string" &&
    ["A1", "A2", "B1", "B2"].includes(input.englishLevel)
      ? input.englishLevel
      : "A2";

  const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0.85,
      messages: [
        { role: "system", content: buildSystemPrompt() },
        {
          role: "user",
          content: buildUserPrompt({ topic, difficulty, teamSize, menuCount, englishLevel }),
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "lunch_scenario_pack",
          strict: true,
          schema: SCENARIO_SCHEMA,
        },
      },
    }),
  });

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
    const pack = normalizeScenarioPack({
      ...(parsed as Record<string, unknown>),
      version: 1,
    }) satisfies ScenarioPack;
    return NextResponse.json(pack);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "normalize failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
