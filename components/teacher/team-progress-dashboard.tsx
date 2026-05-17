"use client";

import { useMemo } from "react";

import { LoadingState } from "@/components/ui/loading-state";
import type { ActivityPack } from "@/lib/activity-pack/types";
import { scoreForHintLevel } from "@/lib/activity-pack/scoring";
import type { GroupRow } from "@/lib/api/play";

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
    <section className="space-y-3 rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-4 shadow-[var(--elevation-sm)]">
      <header>
        <h2 className="text-sm font-semibold text-[var(--foreground)]">팀 과제 진행</h2>
        <p className="mt-1 text-xs text-[var(--muted-foreground)]">
          항목 획득·과제 완성·최종 제출 현황입니다.
        </p>
      </header>
      {loading ? (
        <LoadingState variant="section" label="불러오는 중…" />
      ) : groups.length === 0 ? (
        <p className="text-sm text-[var(--muted-foreground)]">배정된 팀이 없습니다.</p>
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:gap-3 lg:grid-cols-3">
          {groups.map((g) => (
            <GroupProgressCard key={g.group.id} group={g} taskTotal={taskTotal} pack={pack} />
          ))}
        </div>
      )}
    </section>
  );
}

function GroupProgressCard({
  group,
  taskTotal,
  pack,
}: {
  group: GroupProgressGroup;
  taskTotal: number;
  pack: ActivityPack | null;
}) {
  const { group, memberCount } = group;
  const acquired = group.acquired_items.length;
  const itemTotal = pack?.items.length ?? 0;
  const tasksDone = group.completed_tasks.length;
  const activityCompleted = Boolean(group.completed_at);

  const score = useMemo(() => {
    let total = 0;
    for (const a of group.acquired_items) {
      total += scoreForHintLevel(a.hintLevelUsed);
    }
    for (const m of group.completed_tasks) {
      total += m.score;
    }
    if (activityCompleted) total += 5;
    return total;
  }, [group.acquired_items, group.completed_tasks, activityCompleted]);

  return (
    <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-2.5 shadow-sm">
      <div className="flex items-baseline justify-between gap-2">
        <p className="font-mono text-lg font-semibold text-[var(--accent)]">{group.name ?? "—"}</p>
        <span className="text-[10px] text-[var(--muted-foreground)]">{memberCount}명</span>
      </div>
      <dl className="mt-2 space-y-1 text-[11px]">
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
          <dd className={activityCompleted ? "font-semibold text-[var(--primary)]" : "text-[var(--muted-foreground)]"}>
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
