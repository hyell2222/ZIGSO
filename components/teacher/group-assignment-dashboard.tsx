"use client";

import { useMemo } from "react";

import {
  activityCardGrid,
  activityListRow,
  activityNestedCard,
} from "@/components/activity/activity-layout-chrome";
import { activityLayoutType } from "@/components/activity/activity-layout-typography";
import {
  PhaseSection,
  PhaseSectionBadge,
} from "@/components/activity/phase-section-layout";
import { LoadingState } from "@/components/ui/loading-state";
import { COPY_DEFAULTS } from "@/lib/copy/defaults";
import { HOST_COPY } from "@/lib/copy/teacher";
import { cn } from "@/lib/utils";

export type GroupAssignmentMember = {
  id: string;
  nickname: string | null;
  zoneName: string | null;
  groupName?: string | null;
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
      const itemName = m.zoneName?.trim() || COPY_DEFAULTS.unassignedItem;
      const itemKey = itemName;
      const bucket = map.get(itemKey) ?? { itemKey, itemName, members: [] };
      bucket.members.push({ ...m, groupName: g.group.name });
      map.set(itemKey, bucket);
    }
  }

  return [...map.values()].sort((a, b) => {
    if (a.itemName === COPY_DEFAULTS.unassignedItem) return 1;
    if (b.itemName === COPY_DEFAULTS.unassignedItem) return -1;
    return a.itemName.localeCompare(b.itemName, "ko");
  });
}

export function GroupAssignmentDashboard({
  groups,
  loading,
  groupBy = "group",
  contained = false,
}: {
  groups: GroupAssignmentGroup[];
  loading: boolean;
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

  const memberCount = useMemo(() => {
    if (isItemView) {
      return itemBuckets.reduce((sum, b) => sum + b.members.length, 0);
    }
    return groups.reduce((sum, g) => sum + g.members.length, 0);
  }, [isItemView, itemBuckets, groups]);

  const badgeLabel = isItemView
    ? isEmpty
      ? "0개 아이템"
      : `${itemBuckets.length}개 아이템`
    : isEmpty
      ? "0개 모둠"
      : `${groups.length}개 모둠`;

  return (
    <PhaseSection
      title={HOST_COPY.assignmentTitle}
      heading="section"
      as="h2"
      subtitle={isItemView ? HOST_COPY.assignmentByItem : HOST_COPY.assignmentByGroup}
      headerExtra={
        !loading && !isEmpty ? (
          <PhaseSectionBadge>
            {badgeLabel} · {memberCount}명
          </PhaseSectionBadge>
        ) : null
      }
    >
      {loading ? (
        <LoadingState variant="section" label="불러오는 중…" />
      ) : isEmpty ? (
        <p className={activityLayoutType.bodyMuted}>
          {isItemView ? HOST_COPY.noAssignmentItem : HOST_COPY.noAssignmentGroup}
        </p>
      ) : isItemView ? (
        <div className={activityCardGrid}>
          {itemBuckets.map((item) => (
            <div key={item.itemKey} className={activityNestedCard}>
              <div className="flex items-baseline justify-between gap-2">
                <p className={activityLayoutType.nestedCardHeader}>{item.itemName}</p>
                <span className={activityLayoutType.nestedCardBadge}>{item.members.length}명</span>
              </div>
              <ul className="mt-2 space-y-2">
                {item.members.map((m) => (
                  <li key={m.id} className={activityListRow}>
                    <span className={cn(activityLayoutType.listRowPrimary, "min-w-0 flex-1")}>
                      {m.nickname ?? COPY_DEFAULTS.participant}
                    </span>
                    <span className={activityLayoutType.listRowSecondary}>
                      {m.groupName ?? "—"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <div className={activityCardGrid}>
          {groups.map((g) => (
            <div key={g.group.id} className={activityNestedCard}>
              <div className="flex items-baseline justify-between gap-2">
                <p className={activityLayoutType.nestedCardHeader}>{g.group.name ?? "—"}</p>
                <span className={activityLayoutType.nestedCardBadge}>{g.members.length}명</span>
              </div>
              <ul className="mt-2 space-y-2">
                {g.members.length === 0 ? (
                  <li className="rounded-md border border-dashed border-[var(--border)] px-3 py-2 text-sm text-[var(--muted-foreground)]">
                    아직 배정된 학생 없음
                  </li>
                ) : (
                  g.members.map((m) => (
                    <li key={m.id} className={activityListRow}>
                      <span className={cn(activityLayoutType.listRowPrimary, "min-w-0 flex-1")}>
                        {m.nickname ?? COPY_DEFAULTS.participant}
                      </span>
                      <span
                        className={cn(
                          activityLayoutType.listRowSecondary,
                          "text-[var(--accent)]",
                        )}
                      >
                        {m.zoneName ?? "—"}
                      </span>
                    </li>
                  ))
                )}
              </ul>
            </div>
          ))}
        </div>
      )}
    </PhaseSection>
  );
}
