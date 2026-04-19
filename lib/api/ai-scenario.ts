/**
 * /api/ai/generate-scenario 호출 클라이언트.
 *
 * 서버 응답은 캐릭터/단서를 인덱스 기반으로 돌려준다.
 * 호출자는 받은 결과로 DraftCharacter / DraftClue 를 만든다 (tempId 매핑).
 */

export type AIScenarioRequest = {
  /** 사용자가 입력한 주제/키워드 (선택) */
  prompt?: string;
  /** 사용 가능한 prop asset 식별자 목록 (필수) */
  propAssets: string[];
  /** 목표 난이도 (선택) */
  difficulty?: "Easy" | "Normal" | "Hard";
  /** 권장 단서 총 개수 (선택) */
  targetClueCount?: number;
};

export type AIScenarioResponse = {
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

export async function generateScenarioWithAI(
  body: AIScenarioRequest,
): Promise<AIScenarioResponse> {
  const res = await fetch("/api/ai/generate-scenario", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let detail = "";
    try {
      const json = (await res.json()) as { error?: string; detail?: string };
      detail = json.error ?? json.detail ?? "";
    } catch {
      detail = await res.text().catch(() => "");
    }
    throw new Error(detail || `AI 호출 실패 (HTTP ${res.status})`);
  }
  return (await res.json()) as AIScenarioResponse;
}
