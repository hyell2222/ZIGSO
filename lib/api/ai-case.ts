import type { SuspectEntry } from "@/lib/suspects";

/**
 * /api/ai/generate-case 호출 클라이언트.
 *
 * 응답: 제목·사건 파악 설명·용의자 로스터·난이도·조사 장소·맵 단서(장소 인덱스·좌표).
 * 호출자가 tempId 를 붙여 작성 화면 초안 형태로 변환한다.
 */

export type PropCatalogEntry = {
  asset: string;
  /** 맵 에디터 좌표계 기준 표시 너비(px) — 타일×격자와 동일 */
  w: number;
  /** 맵 에디터 좌표계 기준 표시 높이(px) — 타일×격자와 동일 */
  h: number;
};

export type AICaseRequest = {
  /** 사용자가 입력한 주제/키워드 (선택) */
  prompt?: string;
  /** 사용 가능한 소품asset 식별자 목록 (필수) */
  propAssets: string[];
  /**
   * 에셋별 맵상 픽셀 크기(선택). 있으면 서버가 단서 w/h 를 이 값으로 맞추고 좌표를 다시 클램프한다.
   */
  propCatalog?: PropCatalogEntry[];
  /** 목표 난이도 (선택) */
  difficulty?: "Easy" | "Normal" | "Hard";
  /** 조사 장소당 권장 단서 개수 (선택) */
  cluesPerZone?: number;
  /** 팀당 학생 인원(협동 규모 힌트), 보통 2~12 */
  teamSize?: number;
  /** 학습 목표 — 사건·단서에 반영 */
  learningObjective?: string;
  /**
   * true 이면 AI가 사건 전체를 영어로 생성한다.
   * (제목·개요·조사 장소명·용의자 이름·프로필·모든 단서 제목·본문)
   * @deprecated 하위 호환용 — cluesInEnglish 를 대신 보내도 동일 처리
   */
  caseInEnglish?: boolean;
  cluesInEnglish?: boolean;
};

export type AICaseResponse = {
  title: string;
  description: string;
  suspect_roster: SuspectEntry[];
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
