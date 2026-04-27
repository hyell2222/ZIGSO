/**
 * AI 사건 생성 라우트 — POST /api/ai/generate-case
 *
 * prop 목록 + 선택 주제·난이도·단서 개수 → OpenAI structured output 으로
 * 마법사 초안 JSON (기본 정보 / 용의자 텍스트 / 구역 / 맵 단서 좌표).
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
const CASE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["title", "description", "suspect_roster", "difficulty", "investigation_zones", "clues"],
  properties: {
    title: { type: "string" },
    description: { type: "string" },
    suspect_roster: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "name", "detail"],
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          detail: { type: "string" },
        },
      },
    },
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
  suspect_roster: Array<{ id: string; name: string; detail: string }>;
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
    "너는 HiddenSchool(히든스쿨)용 '비밀 탐정 동아리 / MYSTERY CLUB' 협동 추리 사건을 한국어로 설계하는 작가다.",
    "교사가 웹 마법사에 붙여 넣을 초안 JSON 만 출력한다. 범인 지정·세션 운영은 교사 몫이다.",
    "",
    "[제품 맥락]",
    "- 마법사 단계: (1) 사건 기본 정보 — 제목·사건 개요(브리핑)·난이도 (2) 용의자·범인 후보 (3) 조사 구역 이름 (4) 맵에 올릴 단서=소품.",
    "- 학생 플로우: 사건 코드 입장 → 브리핑(사건 개요·용의자·부원증) → 팀별 조사 구역에서 단서 수집 → 최종 보고서에서 등록된 용의자 중 한 명만 범인 선택.",
    "- 조사 구역마다 별도 맵이 있고, 단서는 해당 구역 맵에만 배치된다. 부장·차장·부원 역할과 순찰 구역은 세션 시작 시 랜덤 배정(여기서 지정하지 않음).",
    `- 맵 월드: 가로 ${WORLD_W}px × 세로 ${WORLD_H}px, 탑다운. 좌표는 격자 40px에 맞추면 좋다(가능하면 x·y를 40의 배수로).`,
    "",
    "[난이도]",
    "- Easy: 단서가 직관적이고 연결이 적다. Normal: 균형. Hard: 여러 단서를 조합해야 하고 허위·우연을 구분해야 한다.",
    "",
    "[필드별 규칙]",
    `· title: 한국어 8~28자. 학교·동아리 미스터리 톤, 스포일러 없음.`,
    "· description: 한국어 180~320자. 브리핑에 그대로 보이므로 범인 실명·범행 확정 서술은 금지. 의뢰 맥락·알려진 사실·긴장감만.",
    "· suspect_roster: 2~4명. 각 항목에 id(영문·숫자·하이픈 등 URL-safe한 짧은 식별자, 사건 내 고유), name(이름), detail(역할·알리바이·특징 한두 문장).",
    "  id 예: su_min, su_jae (한글 금지). 용의자들만 넣고, description 에서 범인이 누구인지 드러내지 말 것.",
    "· difficulty: 정확히 \"Easy\" | \"Normal\" | \"Hard\".",
    "· investigation_zones: 2~5개. zone_name만. 학교 안 장소 한국어, 서로 절대 중복 금지, 비슷한 이름도 피할 것.",
    "· clues:",
    "  - assignment_index: investigation_zones 배열의 0부터 시작하는 인덱스. 구역마다 개수가 비슷하게 분배(대략 구역당 3~6개).",
    "  - asset: 반드시 아래 [사용 가능한 prop asset 목록]에 있는 문자열만. 없는 이름·변형 금지.",
    `  - x, y: 소품 중심 좌표. ${WORLD_W}×${WORLD_H} 안에 완전히 들어오게. 권장: x는 ${40}~${WORLD_W - 40}, y는 ${40}~${WORLD_H - 40}.`,
    "  - w, h: 48~128(짝수 선호). 같은 구역 안에서는 서로 겹치지 않게 최소 72px 이상 간격.",
    "  - name: 맵 목록에 보이는 짧은 단서 제목(한국어 2~12자), 고유하게.",
    "  - content: 플레이어가 읽는 본문. 1~3문장. 분위기+추리 단서. description 과 모순 없게.",
    "",
    "[일관성]",
    "- 제목·개요·구역명·단서·용의자가 하나의 사건으로 맞물릴 것.",
    "- 현실 학교에서 벌어질 법한 사건(폭력·혐오 과도 묘사 금지).",
    "",
    "[사용 가능한 prop asset 목록 — 이 중에서만 asset 선택]",
    propAssets.join(", "),
  ].join("\n");
}

function buildUserPrompt(theme: string, difficulty?: string, propCountTarget?: number): string {
  const lines: string[] = [];
  lines.push(
    "위 시스템 규칙을 모두 지켜, 스키마에 맞는 JSON 객체 하나만 생성해줘. 마크다운·코드 펜스·주석 없이 순수 JSON만.",
  );
  if (theme.trim()) {
    lines.push("");
    lines.push("[사용자 주제·키워드 — 이 방향으로 사건을 짜되 세부는 채워도 됨]");
    lines.push(theme.trim());
  } else {
    lines.push("");
    lines.push("[사용자 주제 없음 — 학교 배경 미스터리를 알아서 제안]");
  }
  if (difficulty) {
    lines.push("");
    lines.push(`[요청 난이도] ${difficulty} (difficulty 필드에 동일 값)`);
  }
  if (propCountTarget && propCountTarget > 0) {
    lines.push("");
    lines.push(
      `[단서 개수] clues 배열 총합이 대략 ${propCountTarget}개에 가깝게(±3). 구역 수를 고려해 나눌 것.`,
    );
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
          schema: CASE_SCHEMA,
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

  const defaultRoster: AICaseResponse["suspect_roster"] = [
    { id: "s1", name: "용의자 A", detail: "학생" },
    { id: "s2", name: "용의자 B", detail: "학생" },
  ];

  const suspectRoster = normalizeAiSuspectRoster(parsed.suspect_roster, defaultRoster);

  const sanitized: AICaseResponse = {
    ...parsed,
    suspect_roster: suspectRoster,
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

function normalizeAiSuspectRoster(
  raw: unknown,
  fallback: AICaseResponse["suspect_roster"],
): AICaseResponse["suspect_roster"] {
  if (!Array.isArray(raw) || raw.length === 0) return fallback;
  const out = raw
    .map((row, i) => {
      if (!row || typeof row !== "object") return null;
      const o = row as Record<string, unknown>;
      const id = typeof o.id === "string" && o.id.trim() ? o.id.trim() : `s${i + 1}`;
      const name = typeof o.name === "string" ? o.name : "";
      const detail = typeof o.detail === "string" ? o.detail : "";
      return { id, name, detail };
    })
    .filter((v): v is AICaseResponse["suspect_roster"][number] => v != null);
  return out.length > 0 ? out : fallback;
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}
