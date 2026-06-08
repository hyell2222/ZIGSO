"use client";

import { useMemo, type ReactNode } from "react";

import {
  activityCardGrid,
  activityTeacherGroupCard,
  activityTeacherMemberRow,
} from "@/components/activity/activity-layout-chrome";
import { activityLayoutType } from "@/components/activity/activity-layout-typography";
import { LoadingState } from "@/components/ui/loading-state";
import type { ActivityPhase } from "@/lib/types";
import { cn } from "@/lib/utils";

export type GroupAssignmentMember = {
  id: string;
  nickname: string | null;
  zoneName: string | null;
  groupName?: string | null;
  phaseComplete?: boolean;
};

export type GroupAssignmentGroup = {
  group: { id: string; name: string | null };
  members: GroupAssignmentMember[];
};

export type ItemAssignmentBucket = {
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

function AssignmentMemberRow({
  member,
  secondary,
}: {
  member: GroupAssignmentMember;
  secondary: ReactNode;
}) {
  return (
    <li className={activityTeacherMemberRow}>
      <span className={cn(activityLayoutType.listRowPrimary, "flex min-w-0 flex-1 items-center gap-1.5")}>
        <span className="min-w-0 truncate">{member.nickname ?? "참가자"}</span>
        {member.phaseComplete ? (
          <span
            className={cn(
              "shrink-0 rounded-full bg-[var(--primary)] px-1.5 py-0.5 text-xs font-semibold text-[var(--on-primary)] @md:text-sm",
            )}
          >
            완료
          </span>
        ) : null}
      </span>
      <span className={activityLayoutType.listRowSecondary}>{secondary}</span>
    </li>
  );
}

export function GroupAssignmentDashboard({
  groups,
  loading,
  phase,
  groupBy = "group",
  contained = false,
}: {
  groups: GroupAssignmentGroup[];
  loading: boolean;
  phase: ActivityPhase;
  groupBy?: "group" | "item";
  contained?: boolean;
}) {
  void contained;

  const itemBuckets = useMemo(
    () => (groupBy === "item" ? buildItemBuckets(groups) : []),
    [groupBy, groups],
  );

  const isItemView = groupBy === "item";
  const isEmpty = isItemView ? itemBuckets.length === 0 : groups.length === 0;

  void phase;

  return (
    <div>
      {loading ? (
        <LoadingState variant="section" label="불러오는 중…" />
      ) : isEmpty ? (
        <p className={activityLayoutType.bodyMuted}>
          {isItemView ? "배정된 역할이 없습니다." : "배정된 모둠이 없습니다."}
        </p>
      ) : isItemView ? (
        <div className={activityCardGrid}>
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
              <ul className="mt-2.5 space-y-1.5">
                {item.members.map((m) => (
                  <AssignmentMemberRow key={m.id} member={m} secondary={m.groupName ?? "—"} />
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <div className={activityCardGrid}>
          {groups.map((g) => (
            <div key={g.group.id} className={activityTeacherGroupCard}>
              <div className="flex items-baseline justify-between gap-2 border-b border-[color-mix(in_srgb,var(--primary)_8%,var(--border))] pb-2.5">
                <p className={cn(activityLayoutType.panelSectionTitle, "font-mono text-[var(--primary)]")}>
                  {g.group.name ?? "—"}
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
              <ul className="mt-2.5 space-y-1.5">
                {g.members.length === 0 ? (
                  <li className="rounded-md border border-dashed border-[var(--border)] px-3 py-2 text-sm text-[var(--muted-foreground)]">
                    아직 배정된 학생 없음
                  </li>
                ) : (
                  g.members.map((m) => (
                    <AssignmentMemberRow
                      key={m.id}
                      member={m}
                      secondary={
                        <span className="font-medium text-[var(--primary-muted)]">{m.zoneName ?? "—"}</span>
                      }
                    />
                  ))
                )}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
