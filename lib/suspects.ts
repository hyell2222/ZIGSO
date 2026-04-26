/**
 * 사건 용의자(브리핑 + 최종 보고서에서 범인 선택).
 * `id` 는 생성 시 임의 문자열(세션·DB에 저장되는 안정 id).
 */
export type SuspectEntry = {
  id: string;
  name: string;
  detail: string;
};

/** 구 DB/AI 필드 `suspect_profiles`(문자열·JSON) → 화면·편집용 평문 */
export function legacySuspectProfilesPlainText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  try {
    return JSON.stringify(value).trim();
  } catch {
    return String(value).trim();
  }
}

export function parseSuspectRosterFromCase(value: unknown): SuspectEntry[] {
  if (value == null) return [];
  if (Array.isArray(value)) {
    return value
      .map((row) => {
        if (!row || typeof row !== "object") return null;
        const o = row as Record<string, unknown>;
        const id = typeof o.id === "string" ? o.id : "";
        const name = typeof o.name === "string" ? o.name : "";
        const detail = typeof o.detail === "string" ? o.detail : "";
        if (!id) return null;
        return { id, name, detail } satisfies SuspectEntry;
      })
      .filter((v): v is SuspectEntry => v != null);
  }
  return [];
}

/** AI/레거시 한 덩어리 텍스트 → 용의자 배열 (줄마다 1인, "이름 — 설명" 형식 권장) */
export function textLinesToSuspectRoster(text: string, makeId: () => string): SuspectEntry[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const m = line.match(/^(.+?)\s*[—:–-]\s*(.+)$/u);
      if (m) {
        return { id: makeId(), name: m[1]!.trim(), detail: m[2]!.trim() } satisfies SuspectEntry;
      }
      return { id: makeId(), name: line, detail: "" } satisfies SuspectEntry;
    });
}

export function findSuspectName(roster: SuspectEntry[] | null | undefined, suspectId: string | null | undefined) {
  if (!suspectId?.trim()) return null;
  return roster?.find((s) => s.id === suspectId.trim())?.name?.trim() ?? null;
}
