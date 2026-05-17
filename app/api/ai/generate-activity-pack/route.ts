/**
 * Jigsaw 활동 팩 생성 — POST /api/ai/generate-activity-pack
 */

import { NextRequest, NextResponse } from "next/server";

import { EXAMPLE_GAME_NAME } from "@/lib/brand";
import type { ContentLanguage } from "@/lib/activity-pack/content-language";
import { DEFAULT_CONTENT_LANGUAGE } from "@/lib/activity-pack/content-language";
import { normalizeActivityPack } from "@/lib/activity-pack/normalize";
import type { ActivityPack } from "@/lib/activity-pack/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

const ACTIVITY_PACK_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "title",
    "description",
    "difficulty",
    "groupSize",
    "items",
    "tasks",
    "actionCards",
  ],
  properties: {
    title: { type: "string" },
    description: { type: "string" },
    difficulty: { type: "string", enum: ["Easy", "Normal", "Hard"] },
    groupSize: { type: "integer" },
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "name", "category", "hints", "groupHint"],
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          category: {
            type: "string",
            enum: ["primary", "secondary", "tertiary", "quaternary", "bonus", "other"],
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
          groupHint: { type: "string" },
        },
      },
    },
    tasks: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "name", "slot", "itemIds", "steps"],
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          slot: {
            type: "string",
            enum: ["slot1", "slot2", "slot3", "slot4", "slot5", "slot6"],
          },
          itemIds: {
            type: "array",
            items: { type: "string" },
          },
          steps: {
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
    actionCards: {
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

function buildSystemPrompt(contentLanguage: ContentLanguage): string {
  const introRule =
    contentLanguage === "ko"
      ? "- title: Korean, 4–20 characters or short phrase, matching the activity theme.\n- description: Korean activity introduction, 2–4 sentences for teachers/students."
      : "- title: English, 4–12 words, matching the activity theme.\n- description: English activity introduction, 2–4 sentences for teachers/students.";

  const contentLanguageRule =
    contentLanguage === "ko"
      ? "- All gameplay content in Korean: item names (answers), hints stage1–stage5, groupHint, task names, steps sentences, actionCards text."
      : "- All gameplay content in English: item names (answers), hints stage1–stage5, groupHint, task names, steps sentences, actionCards text.";

  return [
    `You design jigsaw cooperative classroom activities for the 'Jigsaw' teacher platform.`,
    `Default template style: '${EXAMPLE_GAME_NAME}' (expert groups deduce items from staged hints, home groups complete tasks). Adapt theme to the teacher's topic.`,
    "",
    "Output JSON only.",
    "",
    "Rules:",
    introRule,
    contentLanguageRule,
    "- difficulty: Easy | Normal | Hard.",
    "- groupSize: integer 2–12.",
    "- items: each needs id (snake_case ASCII), name (answer), category (primary|secondary|tertiary|quaternary|bonus|other), hints stage1–stage5 (stage1 hardest, stage5 easiest), groupHint (short tip for the home group).",
    "- tasks: each has unique slot among slot1–slot6. itemIds must reference item ids. steps: ordered imperative sentences students combine.",
    "- actionCards: pool of sentences students can combine; include all task step sentences plus a few distractors.",
    "- Use up to six task slots when the theme allows.",
    "- No violence, culturally appropriate for Korean middle/high school.",
    "- Hint scoring: stage1=5pts … stage5=1pt — write hints accordingly.",
  ].join("\n");
}

function buildUserPrompt(opts: {
  topic: string;
  difficulty?: string;
  groupSize: number;
  taskCount: number;
  contentLanguage: ContentLanguage;
}): string {
  const lines = [
    `Generate one complete '${EXAMPLE_GAME_NAME}'-style activity pack JSON following the schema.`,
    `Target tasks: about ${opts.taskCount} (use slots slot1–slot6 where appropriate).`,
    `Group size: ${opts.groupSize} students per group.`,
    `Content language for title and description: ${opts.contentLanguage === "ko" ? "Korean" : "English"}.`,
  ];
  if (opts.difficulty) lines.push(`Difficulty: ${opts.difficulty}.`);
  if (opts.topic.trim()) {
    lines.push("", "Activity topic:", opts.topic.trim());
  } else {
    lines.push("", "Activity topic: open cooperative learning theme.");
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
  const groupSize = clamp(
    typeof input.groupSize === "number" ? Math.floor(input.groupSize) : 4,
    2,
    12,
  );
  const taskCount = clamp(
    typeof input.taskCount === "number" ? Math.floor(input.taskCount) : 6,
    1,
    6,
  );
  const contentLanguage: ContentLanguage =
    input.contentLanguage === "en" || input.contentLanguage === "ko"
      ? input.contentLanguage
      : DEFAULT_CONTENT_LANGUAGE;

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
        { role: "system", content: buildSystemPrompt(contentLanguage) },
        {
          role: "user",
          content: buildUserPrompt({
            topic,
            difficulty,
            groupSize,
            taskCount,
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
    const pack = normalizeActivityPack({
      ...(parsed as Record<string, unknown>),
      version: 1,
    }) satisfies ActivityPack;
    return NextResponse.json(pack);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "정규화 실패";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
