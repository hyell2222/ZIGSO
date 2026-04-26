/**
 * /api/ai/generate-case 호출 클라이언트.
 *
 * 응답: 제목·브리핑 설명·용의자 텍스트·난이도·조사 구역·맵 단서(구역 인덱스·좌표).
 * 호출자가 tempId 를 붙여 마법사 초안으로 변환한다.
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
