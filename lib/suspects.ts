/**
 * 사건 용의자(브리핑 + 최종 보고서에서 범인 선택).
 * `id` 는 생성 시 임의 문자열(세션·DB에 저장되는 안정 id).
 */
export type SuspectEntry = {
  id: string;
  name: string;
  detail: string;
};

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

export function findSuspectName(roster: SuspectEntry[] | null | undefined, suspectId: string | null | undefined) {
  if (!suspectId?.trim()) return null;
  return roster?.find((s) => s.id === suspectId.trim())?.name?.trim() ?? null;
}
