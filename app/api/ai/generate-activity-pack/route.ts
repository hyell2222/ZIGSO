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
/** Pro plan: up to 60s. Hobby is capped at 10s — keep role/task counts low or set AI_GENERATION_TIMEOUT_MS. */
export const maxDuration = 60;

const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";
const DEFAULT_OPENAI_TIMEOUT_MS = 50_000;

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
  required: ["title", "description", "groupSize", "itemsPerPlayer", "roles", "tasks"],
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
    tasks: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "title", "description", "acceptedItemIds"],
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          description: { type: "string" },
          acceptedItemIds: {
            type: "array",
            items: { type: "string" },
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
      ? "- All gameplay content in Korean: item names (answers), clues stage1–stage5, task titles and descriptions."
      : "- All gameplay content in English: item names (answers), clues stage1–stage5, task titles and descriptions.";

  return [
    `You design jigsaw cooperative classroom activities for the 'Jigsaw' teacher platform.`,
    `Default template style: '${EXAMPLE_GAME_NAME}' — expert groups deduce items from staged clues; home groups complete cooperative tasks by submitting acquired items.`,
    "",
    "Output JSON only.",
    "",
    "Rules:",
    introRule,
    contentLanguageRule,
    "- groupSize: must equal roles.length (2–12).",
    "- itemsPerPlayer: max items in any single role (usually 1–2).",
    "- roles: each has id (snake_case ASCII) and items[] (deduction targets). Role display names are auto-assigned codenames at play time — do not rely on role name.",
    "- role items: id, name (correct answer), clues stage1–stage5 (stage1 hardest, stage5 easiest).",
    "- tasks: cooperative home-group assignments. Each has id, title, description, acceptedItemIds (item ids that must ALL be acquired and submitted together to complete the task).",
    "- Every acceptedItemId must reference an item id inside roles. List every item the home group must submit for that task.",
    "- Create 2–6 roles with 1–2 items each and 2–6 tasks when the theme allows.",
    "- No violence, culturally appropriate for Korean middle/high school.",
    "- Clue scoring: stage1=5pts … stage5=1pt — write clues accordingly.",
  ].join("\n");
}

function buildUserPrompt(opts: {
  topic: string;
  difficulty?: string;
  roleCount: number;
  taskCount: number;
  contentLanguage: ContentLanguage;
}): string {
  const lines = [
    `Generate one complete '${EXAMPLE_GAME_NAME}'-style activity pack JSON following the schema.`,
    `Target tasks: about ${opts.taskCount}.`,
    `Create exactly ${opts.roleCount} roles (group size equals role count). Each role should have 1–2 items with full 5-stage clues.`,
    `Content language for title and description: ${opts.contentLanguage === "ko" ? "Korean" : "English"}.`,
  ];
  if (opts.difficulty) {
    lines.push(
      `Calibrate clue difficulty and task complexity for ${opts.difficulty} level (do not output a difficulty field).`,
    );
  }
  if (opts.topic.trim()) {
    lines.push("", "Activity topic:", opts.topic.trim());
  } else {
    lines.push("", "Activity topic: open cooperative learning theme (e.g. school festival booth).");
  }
  return lines.join("\n");
}

function readOpenAiConfig() {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const model = process.env.OPENAI_MODEL?.trim() || DEFAULT_OPENAI_MODEL;
  const timeoutMs = Number(process.env.AI_GENERATION_TIMEOUT_MS) || DEFAULT_OPENAI_TIMEOUT_MS;
  return { apiKey, model, timeoutMs: Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : DEFAULT_OPENAI_TIMEOUT_MS };
}

/** Quick check that the route is deployed and env is visible (no OpenAI call). */
export async function GET() {
  const { apiKey, model } = readOpenAiConfig();
  return NextResponse.json({
    ok: true,
    openaiConfigured: Boolean(apiKey),
    model,
  });
}

export async function POST(req: NextRequest) {
  const { apiKey, model, timeoutMs } = readOpenAiConfig();

  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY 환경변수가 설정되어 있지 않습니다." },
      { status: 500 },
    );
  }

  try {

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
  const taskCount = clamp(
    typeof input.taskCount === "number" ? Math.floor(input.taskCount) : 4,
    1,
    8,
  );
  const contentLanguage: ContentLanguage =
    input.contentLanguage === "en" || input.contentLanguage === "ko"
      ? input.contentLanguage
      : DEFAULT_CONTENT_LANGUAGE;

  let openaiResponse: Response;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        temperature: 0.85,
        max_tokens: 4096,
        messages: [
          { role: "system", content: buildSystemPrompt(contentLanguage) },
          {
            role: "user",
            content: buildUserPrompt({
              topic,
              difficulty,
              roleCount,
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
  } catch (e) {
    const aborted = e instanceof Error && e.name === "AbortError";
    const msg = aborted
      ? `OpenAI 응답이 ${Math.round(timeoutMs / 1000)}초 안에 오지 않았습니다. 역할·미션 수를 줄이거나 Vercel Pro(60초)에서 재시도해 주세요.`
      : e instanceof Error
        ? e.message
        : "OpenAI 연결 실패";
    console.error("[generate-activity-pack] OpenAI fetch failed:", msg);
    return NextResponse.json(
      { error: aborted ? "AI 생성 시간 초과" : "OpenAI API에 연결할 수 없습니다.", detail: msg },
      { status: aborted ? 504 : 502 },
    );
  } finally {
    clearTimeout(timeout);
  }

  if (!openaiResponse.ok) {
    const errText = await openaiResponse.text().catch(() => "");
    console.error("[generate-activity-pack] OpenAI HTTP error:", openaiResponse.status, errText.slice(0, 200));
    return NextResponse.json(
      { error: "OpenAI API 오류", detail: errText.slice(0, 500) },
      { status: 502 },
    );
  }

  let completion: { choices?: Array<{ message?: { content?: string } }> };
  try {
    completion = (await openaiResponse.json()) as typeof completion;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "OpenAI JSON 파싱 실패";
    console.error("[generate-activity-pack] OpenAI response JSON parse failed:", msg);
    return NextResponse.json({ error: "OpenAI 응답 파싱 실패", detail: msg }, { status: 502 });
  }
  const content = completion.choices?.[0]?.message?.content;
  if (!content) {
    console.error("[generate-activity-pack] OpenAI returned empty content");
    return NextResponse.json({ error: "AI 응답이 비어 있습니다." }, { status: 502 });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    console.error("[generate-activity-pack] AI content JSON parse failed:", content.slice(0, 200));
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
    console.error("[generate-activity-pack] pack validation failed:", msg);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "서버 오류";
    console.error("[generate-activity-pack] unhandled error:", e);
    return NextResponse.json({ error: "활동 팩 생성 실패", detail: msg }, { status: 500 });
  }
}
