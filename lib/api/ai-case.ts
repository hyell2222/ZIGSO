/**
 * /api/ai/generate-case 호출 클라이언트.
 *
 * 서버 응답은 조사 구역(맵) 목록/단서를 인덱스 기반으로 돌려준다.
 * 호출자는 받은 결과로 DraftInvestigationZone / DraftClue 를 만든다 (tempId 매핑).
 */

export type AICaseRequest = {
  /** 사용자가 입력한 주제/키워드 (선택) */
  prompt?: string;
  /** 사용 가능한 prop asset 식별자 목록 (필수) */
  propAssets: string[];
  /** 목표 난이도 (선택) */
  difficulty?: "Easy" | "Normal" | "Hard";
  /** 권장 단서 총 개수 (선택) */
  targetClueCount?: number;
};

export type AICaseResponse = {
  title: string;
  description: string;
  /** 브리핑용 용의자 프로필 (여러 줄 텍스트) */
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

export async function generateCaseWithAI(
  body: AICaseRequest,
): Promise<AICaseResponse> {
  const res = await fetch("/api/ai/generate-case", {
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
  return (await res.json()) as AICaseResponse;
}
