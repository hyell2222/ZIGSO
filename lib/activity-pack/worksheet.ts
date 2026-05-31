import type { HomeWorksheet, Item, Role, WorksheetSlot } from "@/lib/activity-pack/types";

export const WORKSHEET_SLOT_PATTERN = /\{\{([a-zA-Z0-9_-]+)\}\}/g;

/** passage에서 {{slot_id}} 토큰 목록 (순서 유지) */
export function extractSlotIdsFromPassage(passage: string): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const match of passage.matchAll(WORKSHEET_SLOT_PATTERN)) {
    const id = match[1]?.trim();
    if (id && !seen.has(id)) {
      seen.add(id);
      ids.push(id);
    }
  }
  return ids;
}

/** 역할·아이템으로 기본 슬롯 생성 (역할당 primary item 1개) */
export function buildDefaultWorksheetSlots(roles: Role[]): WorksheetSlot[] {
  return roles.map((role) => {
    const item = role.items[0];
    if (!item) {
      throw new Error(`role ${role.id} has no items`);
    }
    return {
      id: `slot_${item.id}`,
      itemId: item.id,
      ownerRoleId: role.id,
    };
  });
}

/** 본문 핵심 단어로 기본 최종 요약문 생성 */
export function buildDefaultSummaryPassage(items: Item[], slots: WorksheetSlot[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) {
    const s = slots[0]!;
    return `According to the reading passage, the key word is {{${s.id}}}.`;
  }
  if (items.length === 2) {
    return `According to the reading passage, we should protect {{${slots[0]!.id}}} from {{${slots[1]!.id}}}.`;
  }
  return `According to the reading passage, we should protect {{${slots[0]!.id}}}, reduce {{${slots[1]!.id}}}, and {{${slots[2]!.id}}} more often.`;
}

export function buildDefaultHomeWorksheet(roles: Role[], items: Item[]): HomeWorksheet {
  const slots = buildDefaultWorksheetSlots(roles);
  return {
    summaryPassage: buildDefaultSummaryPassage(items, slots),
    slots,
  };
}

/** passage 토큰과 slots 동기화 — 누락 슬롯 자동 추가 */
export function syncWorksheetSlotsFromPassage(
  worksheet: HomeWorksheet,
  roles: Role[],
): HomeWorksheet {
  const tokenIds = extractSlotIdsFromPassage(worksheet.summaryPassage);
  const slotById = new Map(worksheet.slots.map((s) => [s.id, s]));
  const itemById = new Map(roles.flatMap((r) => r.items).map((i) => [i.id, i]));
  const roleByItemId = new Map<string, string>();
  for (const role of roles) {
    for (const item of role.items) {
      if (!roleByItemId.has(item.id)) {
        roleByItemId.set(item.id, role.id);
      }
    }
  }

  const defaultSlots = buildDefaultWorksheetSlots(roles);
  const defaultBySlotId = new Map(defaultSlots.map((s) => [s.id, s]));

  const slots: WorksheetSlot[] = tokenIds.map((id) => {
    const existing = slotById.get(id);
    if (existing) return existing;
    const fromDefault = defaultBySlotId.get(id);
    if (fromDefault) return fromDefault;
    const itemId = id.replace(/^slot_/, "");
    if (itemById.has(itemId)) {
      return {
        id,
        itemId,
        ownerRoleId: roleByItemId.get(itemId) ?? roles[0]!.id,
      };
    }
    return {
      id,
      itemId: roles[0]!.items[0]!.id,
      ownerRoleId: roles[0]!.id,
    };
  });

  return { ...worksheet, slots };
}

export type PassageSegment =
  | { type: "text"; value: string }
  | { type: "slot"; slotId: string };

/** summaryPassage → 렌더 세그먼트 */
export function parsePassageSegments(passage: string): PassageSegment[] {
  const segments: PassageSegment[] = [];
  let lastIndex = 0;
  for (const match of passage.matchAll(WORKSHEET_SLOT_PATTERN)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      segments.push({ type: "text", value: passage.slice(lastIndex, index) });
    }
    const slotId = match[1]?.trim();
    if (slotId) {
      segments.push({ type: "slot", slotId });
    }
    lastIndex = index + match[0].length;
  }
  if (lastIndex < passage.length) {
    segments.push({ type: "text", value: passage.slice(lastIndex) });
  }
  return segments;
}
