/**
 * AI 시나리오 생성 라우트.
 *
 * 클라이언트가 사용 가능한 prop asset 목록과 (선택적) 주제 키워드를 보내면,
 * OpenAI structured outputs 를 이용해 시나리오 한 벌 (제목/설명/난이도/캐릭터/단서) 을 생성한다.
 *
 * 요구 환경변수:
 * - OPENAI_API_KEY  (필수)
 * - OPENAI_MODEL    (선택, 기본: "gpt-4o-mini")
 */

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
// Vercel 배포 시 응답 시간 여유 확보 (로컬에서는 무시됨)
export const maxDuration = 60;

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

const WORLD_W = 800;
const WORLD_H = 600;

/**
 * OpenAI structured outputs 의 strict 모드에서는 minimum/maximum/minItems 같은
 * 제약이 지원되지 않으므로, 모든 분포 규칙은 prompt 로만 전달한다.
 */
const SCENARIO_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["title", "description", "suspect_profiles", "difficulty", "investigation_zones", "clues"],
  properties: {
    title: { type: "string" },
    description: { type: "string" },
    suspect_profiles: { type: "string" },
    difficulty: { type: "string", enum: ["Easy", "Normal", "Hard"] },
    investigation_zones: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["zone_name"],
        properties: {
          zone_name: { type: "string" },
        },
      },
    },
    clues: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["assignment_index", "asset", "name", "content", "x", "y", "w", "h"],
        properties: {
          assignment_index: { type: "integer" },
          asset: { type: "string" },
          name: { type: "string" },
          content: { type: "string" },
          x: { type: "number" },
          y: { type: "number" },
          w: { type: "number" },
          h: { type: "number" },
        },
      },
    },
  },
} as const;

type AICaseResponse = {
  title: string;
  description: string;
  suspect_profiles: string;
  difficulty: "Easy" | "Normal" | "Hard";
  investigation_zones: Array<{ zone_name: string }>;
  clues: Array<{
    assignment_index: number;
    asset: string;
    name: string;
    content: string;
    x: number;
    y: number;
    w: number;
    h: number;
  }>;
};

function buildSystemPrompt(propAssets: string[]): string {
  return [
    "너는 초·중등 교실에서 사용할 '비밀 탐정 동아리(Mystery Club)' 사건·의뢰 협동 추리 시나리오를 한국어로 만드는 전문 작가야.",
    "",
    "[게임 구조]",
    "- 사건이 벌어진 '조사 구역'(예: 음악준비실, 옥상)마다 맵이 하나씩 있고, 선생님이 둔 단서(prop)는 그 맵에만 붙는다.",
    "- 실제로 플레이어의 부장·차장·부원 역할과 어느 맵을 순찰할지는 나중에 게임 세션에서 랜덤 배정된다. 여기서는 조사 맵(구역) 목록과 단서만 만든다.",
    "- 맵 캔버스는 가로 800px × 세로 600px 탑다운 2D.",
    "- 팀이 단서를 모아 사건(의뢰)의 진실을 찾는다.",
    "",
    "[출력 규칙 — 반드시 지킬 것]",
    "- difficulty: \"Easy\" | \"Normal\" | \"Hard\" 중 하나.",
    "- investigation_zones: 2~5개. 각 항목은 zone_name(한국어)만. 서로 다른 장소명, 겹치지 않게.",
    "- clues: 구역(assignment)당 3~6개씩 골고루. assignment_index는 investigation_zones 배열의 0-based 인덱스.",
    `  · asset: 아래 [사용 가능한 prop asset 목록] 중에서만. 목록에 없는 값 금지.`,
    `  · x, y: 중심 좌표. 월드 ${WORLD_W}×${WORLD_H} 내 60 ≤ x ≤ ${WORLD_W - 60}, 60 ≤ y ≤ ${WORLD_H - 60} 권장.`,
    "  · w, h: 60~120 정도. 같은 구역 prop은 80px 이상 떨어뜨릴 것.",
    "- title: 8~25자, 미스터리 느낌.",
    "- description: 150~250자, 비밀 탐정 동아리가 맡은 의뢰·사건이 드러나게.",
    "- suspect_profiles: 용의자 2~4명. 각각 이름·역할·알리바이 한 줄씩. 줄바꿈으로 구분.",
    "- 단서 content: 추리에 도움 되는 1~2문장.",
    "- 제목·구역·단서가 하나의 사건으로 일관되게.",
    "",
    "[사용 가능한 prop asset 목록]",
    propAssets.join(", "),
  ].join("\n");
}

function buildUserPrompt(theme: string, difficulty?: string, propCountTarget?: number): string {
  const lines: string[] = [];
  lines.push("아래 요청에 맞춰 시나리오 한 벌을 JSON 으로 생성해줘.");
  if (theme.trim()) {
    lines.push("");
    lines.push("[사용자 요청 주제/키워드]");
    lines.push(theme.trim());
  }
  if (difficulty) {
    lines.push("");
    lines.push(`[목표 난이도] ${difficulty}`);
  }
  if (propCountTarget && propCountTarget > 0) {
    lines.push("");
    lines.push(`[권장 단서 총 개수] 약 ${propCountTarget} 개`);
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

  const input = body as {
    prompt?: unknown;
    propAssets?: unknown;
    difficulty?: unknown;
    targetClueCount?: unknown;
  };

  const propAssets: string[] = Array.isArray(input.propAssets)
    ? input.propAssets.filter((v): v is string => typeof v === "string" && v.length > 0)
    : [];
  if (propAssets.length === 0) {
    return NextResponse.json(
      { error: "사용 가능한 prop asset 목록이 비어있습니다." },
      { status: 400 },
    );
  }

  const theme = typeof input.prompt === "string" ? input.prompt : "";
  const difficulty =
    typeof input.difficulty === "string" &&
    ["Easy", "Normal", "Hard"].includes(input.difficulty)
      ? input.difficulty
      : undefined;
  const targetClueCount =
    typeof input.targetClueCount === "number" && Number.isFinite(input.targetClueCount)
      ? Math.max(0, Math.floor(input.targetClueCount))
      : undefined;

  const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0.9,
      messages: [
        { role: "system", content: buildSystemPrompt(propAssets) },
        { role: "user", content: buildUserPrompt(theme, difficulty, targetClueCount) },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "case",
          strict: true,
          schema: SCENARIO_SCHEMA,
        },
      },
    }),
  });

  if (!openaiResponse.ok) {
    const detail = await openaiResponse.text().catch(() => "");
    return NextResponse.json(
      { error: `OpenAI 호출 실패 (${openaiResponse.status})`, detail },
      { status: 502 },
    );
  }

  const data = (await openaiResponse.json()) as {
    choices?: Array<{ message?: { content?: string; refusal?: string | null } }>;
  };
  const choice = data.choices?.[0]?.message;
  if (choice?.refusal) {
    return NextResponse.json({ error: `모델이 거절: ${choice.refusal}` }, { status: 400 });
  }
  const content = choice?.content;
  if (!content) {
    return NextResponse.json({ error: "OpenAI 응답이 비어있습니다." }, { status: 502 });
  }

  let parsed: AICaseResponse;
  try {
    parsed = JSON.parse(content) as AICaseResponse;
  } catch {
    return NextResponse.json(
      { error: "OpenAI 응답을 JSON 으로 파싱할 수 없습니다.", raw: content },
      { status: 502 },
    );
  }

  // 후처리: 좌표/크기 안전 클램프 + 알 수 없는 asset 제거
  const assetSet = new Set(propAssets);
  const slotCount = parsed.investigation_zones.length;

  const suspect =
    typeof parsed.suspect_profiles === "string" && parsed.suspect_profiles.trim()
      ? parsed.suspect_profiles.trim()
      : "용의자 A — 학생\n용의자 B — 학생";

  const sanitized: AICaseResponse = {
    ...parsed,
    suspect_profiles: suspect,
    clues: parsed.clues
      .filter(
        (c) =>
          assetSet.has(c.asset) &&
          Number.isFinite(c.assignment_index) &&
          c.assignment_index >= 0 &&
          c.assignment_index < slotCount,
      )
      .map((c) => {
        const w = clamp(Math.round(c.w || 80), 24, WORLD_W);
        const h = clamp(Math.round(c.h || 80), 24, WORLD_H);
        const x = clamp(Math.round(c.x), w / 2, WORLD_W - w / 2);
        const y = clamp(Math.round(c.y), h / 2, WORLD_H - h / 2);
        return { ...c, w, h, x, y };
      }),
  };

  return NextResponse.json(sanitized);
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}
