/** 학생 UI — 배정 항목 표시 (정답 이름은 노출하지 않음) */

export function itemSlotLabel(index: number): string {
  return `항목 ${index + 1}`;
}

export function formatAssignedSlots(assignedCount: number): string | null {
  if (assignedCount <= 0) return null;
  if (assignedCount === 1) return itemSlotLabel(0);
  return `${itemSlotLabel(0)} 외 ${assignedCount - 1}개`;
}

export function formatAssignedSlotsShort(assignedCount: number): string | null {
  if (assignedCount <= 0) return null;
  if (assignedCount === 1) return "배정 1건";
  return `배정 ${assignedCount}건`;
}
