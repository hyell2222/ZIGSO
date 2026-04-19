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
  required: ["title", "description", "difficulty", "characters", "clues"],
  properties: {
    title: { type: "string" },
    description: { type: "string" },
    difficulty: { type: "string", enum: ["Easy", "Normal", "Hard"] },
    characters: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "role"],
        properties: {
          name: { type: "string" },
          role: { type: "string" },
        },
      },
    },
    clues: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["character_index", "asset", "name", "content", "x", "y", "w", "h"],
        properties: {
          character_index: { type: "integer" },
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

type AIScenarioResponse = {
  title: string;
  description: string;
  difficulty: "Easy" | "Normal" | "Hard";
  characters: Array<{ name: string; role: string }>;
  clues: Array<{
    character_index: number;
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
    "너는 초·중등 교실에서 사용할 협동 추리 게임 시나리오를 한국어로 만드는 전문 작가야.",
    "",
    "[게임 구조]",
    "- 학생들은 팀별로 캐릭터에 배정되어 각 캐릭터의 '방'을 조사한다.",
    "- 각 캐릭터의 방은 가로 800px × 세로 600px 의 탑다운 2D 맵이다.",
    "- 단서(clue) 는 방 안의 prop(가구/소품)에 부착되며, 학생이 prop 을 클릭해 단서 내용을 확인한다.",
    "- 팀은 모든 단서를 모아 진실(=시나리오의 결말)을 추리한다.",
    "",
    "[출력 규칙 — 반드시 지킬 것]",
    "- difficulty: \"Easy\" | \"Normal\" | \"Hard\" 중 하나.",
    "- characters: 2~5명. 각 캐릭터는 한국어 이름(name) 과 역할/직업(role) 을 가진다.",
    "  · role 예시: \"체육 선생님\", \"도서부장\", \"전학생\" 등 캐릭터 성격이 드러나게.",
    "- clues: 캐릭터당 3~6개씩 골고루 분포. 너무 한쪽에 몰리지 않게.",
    "  · character_index: characters 배열의 0-based 인덱스 (반드시 유효한 범위).",
    `  · asset: 아래 [사용 가능한 prop asset 목록] 중에서만 골라야 한다. 목록에 없는 값을 출력하면 안 됨.`,
    `  · x, y: prop 의 중심 좌표. 월드 ${WORLD_W}×${WORLD_H} 픽셀 안에서 60 ≤ x ≤ ${WORLD_W - 60}, 60 ≤ y ≤ ${WORLD_H - 60} 권장.`,
    "  · w, h: 표시 크기(px). 보통 60~120 사이. 너무 크게 잡지 말 것.",
    "  · 같은 방의 prop 끼리는 80px 이상 떨어뜨려서 시각적으로 겹치지 않게 배치.",
    "  · 같은 prop asset 을 한 방에서 여러 번 사용해도 됨 (단, 좌표는 다르게).",
    "- title: 8~25자 이내의 흥미로운 제목.",
    "- description: 학생들에게 보여줄 시나리오 배경/목표. 150~250자, 도입부와 미션이 드러나게.",
    "- 각 단서의 content: 1~2문장의 자연스러운 한국어. 추리에 도움이 되는 구체적 정보를 담아라.",
    "- 모든 캐릭터/단서/제목은 시나리오 전체가 일관된 하나의 사건을 이루도록 작성.",
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
          name: "scenario",
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

  let parsed: AIScenarioResponse;
  try {
    parsed = JSON.parse(content) as AIScenarioResponse;
  } catch {
    return NextResponse.json(
      { error: "OpenAI 응답을 JSON 으로 파싱할 수 없습니다.", raw: content },
      { status: 502 },
    );
  }

  // 후처리: 좌표/크기 안전 클램프 + 알 수 없는 asset 제거
  const assetSet = new Set(propAssets);
  const charCount = parsed.characters.length;

  const sanitized: AIScenarioResponse = {
    ...parsed,
    clues: parsed.clues
      .filter(
        (c) =>
          assetSet.has(c.asset) &&
          Number.isFinite(c.character_index) &&
          c.character_index >= 0 &&
          c.character_index < charCount,
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
