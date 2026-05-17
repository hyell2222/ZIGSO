"use client";

import { useMemo } from "react";

import { LoadingState } from "@/components/ui/loading-state";
import type { ActivityPack } from "@/lib/activity-pack/types";
import { computeGroupTotalScore } from "@/lib/activity-pack/session-results";
import type { GroupRow } from "@/lib/api/play";
import { cn } from "@/lib/utils";

export type GroupProgressGroup = {
  group: GroupRow;
  memberCount: number;
};

export function GroupProgressDashboard({
  groups,
  loading,
  pack,
}: {
  groups: GroupProgressGroup[];
  loading: boolean;
  pack: ActivityPack | null;
}) {
  const taskTotal = pack?.tasks.length ?? 0;

  return (
    <section
      className={cn(
        "space-y-2 rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-2.5 shadow-[var(--elevation-sm)]",
        "@md:space-y-3 @md:p-4",
      )}
    >
      <header>
        <h2 className="text-sm font-semibold text-[var(--foreground)] @md:text-base">
          모둠 과제 진행
        </h2>
        <p className="mt-0.5 text-sm leading-snug text-[var(--muted-foreground)] @md:mt-1">
          항목 획득·과제 완성·최종 제출 현황입니다.
        </p>
      </header>
      {loading ? (
        <LoadingState variant="section" label="불러오는 중…" />
      ) : groups.length === 0 ? (
        <p className="text-sm text-[var(--muted-foreground)] @md:text-sm">
          배정된 모둠이 없습니다.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-2.5 @md:grid-cols-2 @md:gap-3 @lg:grid-cols-3 @lg:gap-4">
          {groups.map((g) => (
            <GroupProgressCard key={g.group.id} entry={g} taskTotal={taskTotal} pack={pack} />
          ))}
        </div>
      )}
    </section>
  );
}

function GroupProgressCard({
  entry,
  taskTotal,
  pack,
}: {
  entry: GroupProgressGroup;
  taskTotal: number;
  pack: ActivityPack | null;
}) {
  const { group, memberCount } = entry;
  const acquired = group.acquired_items.length;
  const itemTotal = pack?.items.length ?? 0;
  const tasksDone = group.completed_tasks.length;
  const activityCompleted = Boolean(group.completed_at);

  const score = useMemo(
    () =>
      computeGroupTotalScore({
        id: group.id,
        name: group.name,
        acquired_items: group.acquired_items,
        completed_tasks: group.completed_tasks,
        completed_at: group.completed_at,
      }),
    [group],
  );

  return (
    <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-2 shadow-sm @md:p-2.5">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-mono font-semibold text-[var(--accent)] @md:text-lg">
          {group.name ?? "—"}
        </p>
        <span className="text-xs text-[var(--muted-foreground)]">{memberCount}명</span>
      </div>
      <dl className="mt-2 space-y-1 text-xs @md:text-sm">
        <div className="flex justify-between gap-2">
          <dt className="text-[var(--muted-foreground)]">항목</dt>
          <dd className="font-medium text-[var(--foreground)]">
            {acquired}/{itemTotal || "—"}
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-[var(--muted-foreground)]">과제</dt>
          <dd className="font-medium text-[var(--foreground)]">
            {tasksDone}/{taskTotal || "—"}
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-[var(--muted-foreground)]">완료</dt>
          <dd
            className={
              activityCompleted
                ? "font-semibold text-[var(--primary)]"
                : "text-[var(--muted-foreground)]"
            }
          >
            {activityCompleted ? "완료" : "진행 중"}
          </dd>
        </div>
        <div className="flex justify-between gap-2 border-t border-[var(--border)] pt-1">
          <dt className="text-[var(--muted-foreground)]">점수</dt>
          <dd className="font-semibold tabular-nums text-[var(--primary)]">{score}</dd>
        </div>
      </dl>
    </div>
  );
}
