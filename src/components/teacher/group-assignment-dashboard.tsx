"use client";

import { useMemo } from "react";

import {
  activityTeacherGroupCard,
} from "@/lib/theme/activity-layout-chrome";
import { activityLayoutType } from "@/lib/theme/activity-layout-typography";
import { LoadingState } from "@/components/ui/loading-state";
import { formatGroupDisplayName } from "@/lib/activity-pack/engine";
import { letterLabel } from "@/lib/play/role-codenames";
import { cn } from "@/lib/utils";
import type { ActivityPack } from "@/lib/activity-pack/types";

export type GroupAssignmentMember = {
  id: string;
  nickname: string | null;
  zoneName: string | null;
  groupName?: string | null;
  assignedRoleId?: string | null;
  isOnline?: boolean;
  /** 0–100. null이면 해당 단계에서 진행 표시 없음 */
  phaseProgress?: number | null;
  /** 현재 단계 제출·완료 여부 */
  phaseComplete?: boolean;
};

function isMemberPhaseComplete(member: GroupAssignmentMember): boolean {
  if (member.phaseComplete != null) return member.phaseComplete;
  return member.phaseProgress != null && member.phaseProgress >= 100;
}

export type GroupAssignmentGroup = {
  group: { id: string; name: string | null };
  members: GroupAssignmentMember[];
};

type ItemAssignmentBucket = {
  itemKey: string;
  itemName: string;
  members: GroupAssignmentMember[];
};

function buildItemBuckets(groups: GroupAssignmentGroup[]): ItemAssignmentBucket[] {
  const map = new Map<string, ItemAssignmentBucket>();

  for (const g of groups) {
    for (const m of g.members) {
      const itemName = m.zoneName?.trim() || "미배정";
      const itemKey = itemName;
      const bucket = map.get(itemKey) ?? { itemKey, itemName, members: [] };
      bucket.members.push({ ...m, groupName: g.group.name });
      map.set(itemKey, bucket);
    }
  }

  return [...map.values()].sort((a, b) => {
    if (a.itemName === "미배정") return 1;
    if (b.itemName === "미배정") return -1;
    return a.itemName.localeCompare(b.itemName, "ko");
  });
}

export function SeatingLayout({
  members,
  pack,
  groupBy,
  uniqueGroupNames,
}: {
  members: GroupAssignmentMember[];
  pack?: ActivityPack | null;
  groupBy: "group" | "item";
  uniqueGroupNames: string[];
}) {
  const roles = pack?.roles ?? [];
  const isGroupView = groupBy === "group";
  const totalSeats = isGroupView
    ? Math.max(roles.length, members.length)
    : Math.max(uniqueGroupNames.length, members.length);

  const placedMemberIds = new Set<string>();
  const seats: { slotName: string; member: GroupAssignmentMember | null }[] = [];

  if (isGroupView) {
    // Home Group view: map to roles
    for (let i = 0; i < totalSeats; i++) {
      const role = roles[i];
      if (role) {
        const member = members.find((m) => m.assignedRoleId === role.id && !placedMemberIds.has(m.id)) || null;
        if (member) placedMemberIds.add(member.id);
        seats.push({ slotName: letterLabel(i), member });
      } else {
        seats.push({ slotName: `역할 ${i + 1}`, member: null });
      }
    }

    // Fallback for remaining members
    members.forEach((m) => {
      if (!placedMemberIds.has(m.id)) {
        const emptyIdx = seats.findIndex((s) => s.member === null);
        if (emptyIdx !== -1) {
          seats[emptyIdx].member = m;
          placedMemberIds.add(m.id);
          const roleIdx = roles.findIndex((r) => r.id === m.assignedRoleId);
          if (roleIdx !== -1) {
            seats[emptyIdx].slotName = letterLabel(roleIdx);
          }
        }
      }
    });
  } else {
    // Expert Group view: map to unique home groups
    for (let i = 0; i < totalSeats; i++) {
      const gName = uniqueGroupNames[i];
      if (gName) {
        const member = members.find((m) => m.groupName === gName && !placedMemberIds.has(m.id)) || null;
        if (member) placedMemberIds.add(member.id);
        seats.push({ slotName: gName, member });
      } else {
        seats.push({ slotName: `모둠 ${i + 1}`, member: null });
      }
    }

    // Fallback for remaining members
    members.forEach((m) => {
      if (!placedMemberIds.has(m.id)) {
        const emptyIdx = seats.findIndex((s) => s.member === null);
        if (emptyIdx !== -1) {
          seats[emptyIdx].member = m;
          placedMemberIds.add(m.id);
          if (m.groupName) {
            seats[emptyIdx].slotName = m.groupName;
          }
        }
      }
    });
  }

  const cols = "grid-cols-2";

  return (
    <div className={cn("grid gap-2 w-full mt-3", cols)}>
      {seats.map((seat, idx) => {
        const m = seat.member;
        const isOccupied = m !== null;
        const isOnline = isOccupied ? m.isOnline !== false : false;
        const isComplete = isOccupied ? isMemberPhaseComplete(m) : false;
        const isLastSingle = seats.length % 2 === 1 && idx === seats.length - 1;

        return (
          <div
            key={idx}
            className={cn(
              "relative flex flex-col items-center justify-center p-2 rounded border text-center min-h-[60px] transition-all duration-200",
              isLastSingle ? "col-span-2 justify-self-center w-[calc(50%-4px)]" : "w-full",
              isOccupied
                ? isOnline
                  ? isComplete
                    ? "bg-[color-mix(in_srgb,var(--primary)_8%,var(--surface-overlay))] border-2 border-[var(--primary)] font-semibold"
                    : "bg-[var(--surface-overlay)] border border-[color-mix(in_srgb,var(--primary)_20%,var(--border))]"
                  : "bg-[color-mix(in_srgb,var(--border)_5%,var(--surface-overlay))] border border-dashed border-[var(--border)] opacity-40"
                : "bg-[color-mix(in_srgb,var(--border)_8%,var(--surface-overlay))] border border-dashed border-[var(--border)] opacity-40"
            )}
          >
            {/* 역할/모둠 라벨 */}
            <div className="text-[10px] text-[var(--muted-foreground)] font-semibold leading-none truncate w-full px-1 mb-1.5">
              {seat.slotName}
            </div>

            {/* 학생 이름 또는 빈자리 표시 */}
            <div className="w-full min-w-0 truncate">
              {isOccupied ? (
                <span className={cn(
                  "text-xs font-bold truncate leading-tight block w-full px-1",
                  isOnline ? "text-[var(--foreground)]" : "text-[var(--muted-foreground)]"
                )}>
                  {m.nickname}
                </span>
              ) : (
                <span className="text-[10px] text-[var(--muted-foreground)] opacity-40 block w-full leading-none">
                  —
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function GroupAssignmentDashboard({
  groups,
  loading,
  groupBy = "group",
  pack,
}: {
  groups: GroupAssignmentGroup[];
  loading: boolean;
  groupBy?: "group" | "item";
  pack?: ActivityPack | null;
}) {
  const itemBuckets = useMemo(
    () => (groupBy === "item" ? buildItemBuckets(groups) : []),
    [groupBy, groups],
  );

  const isItemView = groupBy === "item";
  const isEmpty = isItemView ? itemBuckets.length === 0 : groups.length === 0;

  const uniqueGroupNames = useMemo(() => {
    const names = Array.from(new Set(groups.map((g) => g.group.name).filter(Boolean))) as string[];
    return names.sort((a, b) => a.localeCompare(b, "ko", { numeric: true }));
  }, [groups]);

  return (
    <div className="flex w-full min-h-0 flex-1 flex-col items-center">
      {loading ? (
        <LoadingState variant="section" label="불러오는 중…" className="min-h-0 flex-1" />
      ) : isEmpty ? (
        <p className={activityLayoutType.bodyMuted}>
          {isItemView ? "배정된 역할이 없습니다." : "배정된 모둠이 없습니다."}
        </p>
      ) : (
        <>
          <div className="w-full flex flex-col items-center mb-5 mt-1 shrink-0 select-none">
            <div className="bg-[var(--tint-primary-weak)] py-1 px-36 rounded border border-[var(--border)] text-center text-xs font-semibold tracking-widest uppercase">
              칠 판
            </div>
          </div>

          {isItemView ? (
            <div className="grid w-full grid-cols-3 gap-4 md:gap-5">
              {itemBuckets.map((item) => (
                <div key={item.itemKey} className={activityTeacherGroupCard}>
                  <div className="flex items-baseline justify-between gap-2 border-b border-[color-mix(in_srgb,var(--primary)_8%,var(--border))] pb-2.5">
                    <p className={cn(activityLayoutType.panelSectionTitle, "text-[var(--foreground)]")}>
                      {item.itemName}
                    </p>
                    <span
                      className={cn(
                        activityLayoutType.caption,
                        "rounded-full bg-[var(--tint-primary-weak)] px-2 py-0.5 font-medium text-[var(--primary-muted)]",
                      )}
                    >
                      {item.members.length}명
                    </span>
                  </div>
                  <SeatingLayout
                    members={item.members}
                    pack={pack}
                    groupBy="item"
                    uniqueGroupNames={uniqueGroupNames}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid w-full grid-cols-3 gap-4 md:gap-5">
              {groups.map((g) => (
                <div key={g.group.id} className={activityTeacherGroupCard}>
                  <div className="flex items-baseline justify-between gap-2 border-b border-[color-mix(in_srgb,var(--primary)_8%,var(--border))] pb-2.5">
                    <p className={cn(activityLayoutType.panelSectionTitle, "text-[var(--primary)]")}>
                      {formatGroupDisplayName(g.group.name)}
                    </p>
                    <span
                      className={cn(
                        activityLayoutType.caption,
                        "rounded-full bg-[var(--tint-primary-weak)] px-2 py-0.5 font-medium text-[var(--primary-muted)]",
                      )}
                    >
                      {g.members.length}명
                    </span>
                  </div>
                  <SeatingLayout
                    members={g.members}
                    pack={pack}
                    groupBy="group"
                    uniqueGroupNames={uniqueGroupNames}
                  />
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
