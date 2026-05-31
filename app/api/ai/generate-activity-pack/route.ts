/**
 * Jigsaw 활동 팩 생성 — POST /api/ai/generate-activity-pack
 */

import { NextRequest, NextResponse } from "next/server";

import { EXAMPLE_GAME_NAME } from "@/lib/brand";
import { normalizeAiDifficulty } from "@/lib/activity-pack/ai-difficulty";
import type { ContentLanguage } from "@/lib/activity-pack/content-language";
import { DEFAULT_CONTENT_LANGUAGE } from "@/lib/activity-pack/content-language";
import { loadActivityPack } from "@/lib/activity-pack/parse";
import type { ActivityPack } from "@/lib/activity-pack/types";
import { ACTIVITY_PACK_VERSION } from "@/lib/activity-pack/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const OPENAI_MODEL = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";

const PACK_ITEM_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["id", "name", "clues"],
  properties: {
    id: { type: "string" },
    name: { type: "string" },
    clues: {
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
  },
} as const;

const ACTIVITY_PACK_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["title", "description", "groupSize", "itemsPerPlayer", "roles", "homeWorksheet"],
  properties: {
    title: { type: "string" },
    description: { type: "string" },
    groupSize: { type: "integer" },
    itemsPerPlayer: { type: "integer" },
    roles: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "items"],
        properties: {
          id: { type: "string" },
          items: {
            type: "array",
            items: PACK_ITEM_SCHEMA,
          },
        },
      },
    },
    homeWorksheet: {
      type: "object",
      additionalProperties: false,
      required: ["summaryPassage"],
      properties: {
        summaryPassage: { type: "string" },
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
      ? "- All gameplay content in Korean: item names (answers), clues stage1–stage5, summaryPassage."
      : "- All gameplay content in English: item names (answers), clues stage1–stage5, summaryPassage.";

  return [
    `You design jigsaw cooperative classroom activities for the 'Jigsaw' teacher platform.`,
    `Default template: '${EXAMPLE_GAME_NAME}' — expert groups earn word cards from staged clues; home groups complete a shared worksheet with cross-placement (students cannot fill their own blanks).`,
    "",
    "Output JSON only.",
    "",
    "Rules:",
    introRule,
    contentLanguageRule,
    "- groupSize: must equal roles.length (2–12).",
    "- itemsPerPlayer: max items in any single role (usually 1–2).",
    "- roles: each has id (snake_case ASCII) and items[] (vocabulary targets). Role display names are auto-assigned codenames at play time.",
    "- role items: id, name (correct answer), clues stage1–stage5 (stage1 hardest, stage5 easiest).",
    "- homeWorksheet.summaryPassage: a coherent summary paragraph for the home group. Insert each role's primary vocabulary using {{slot_ITEM_ID}} placeholders (e.g. {{slot_rice}} where item id is rice). Include every role's main item exactly once.",
    "- Slot tokens MUST use {{slot_<item_id>}} with exact item id strings from roles. Never use display names inside braces.",
    "- Create 2–6 roles with 1–2 items each when the theme allows.",
    "- No violence, culturally appropriate for Korean middle/high school.",
    "- Clue scoring: stage1=5pts … stage5=1pt — write clues accordingly.",
  ].join("\n");
}

function buildUserPrompt(opts: {
  topic: string;
  difficulty?: string;
  roleCount: number;
  contentLanguage: ContentLanguage;
}): string {
  const lines = [
    `Generate one complete '${EXAMPLE_GAME_NAME}'-style activity pack JSON following the schema.`,
    `Create exactly ${opts.roleCount} roles (group size equals role count). Each role should have 1–2 items with full 5-stage clues.`,
    `The homeWorksheet summaryPassage must include {{slot_<item_id>}} for each role's primary item (${opts.roleCount} blanks).`,
    `Content language for title and description: ${opts.contentLanguage === "ko" ? "Korean" : "English"}.`,
  ];
  if (opts.difficulty) {
    lines.push(
      `Calibrate clue difficulty and summary complexity for ${opts.difficulty} level (do not output a difficulty field).`,
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
