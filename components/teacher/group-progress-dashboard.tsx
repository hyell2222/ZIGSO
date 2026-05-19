"use client";

import { useMemo } from "react";

import {
  activityCardGrid,
  activityNestedCard,
} from "@/components/activity/activity-layout-chrome";
import { activityLayoutType } from "@/components/activity/activity-layout-typography";
import { PhaseSection, PhaseSectionBadge } from "@/components/activity/phase-section-layout";
import { LoadingState } from "@/components/ui/loading-state";
import type { ActivityPack } from "@/lib/activity-pack/types";
import { computeGroupTotalScore } from "@/lib/activity-pack/session-results";
import type { GroupRow } from "@/lib/api/play";

export type GroupProgressGroup = {
  group: GroupRow;
  memberCount: number;
};

export function GroupProgressDashboard({
  groups,
  loading,
  pack,
  contained = false,
}: {
  groups: GroupProgressGroup[];
  loading: boolean;
  pack: ActivityPack | null;
  contained?: boolean;
}) {
  void contained;
  const taskTotal = pack?.tasks.length ?? 0;

  const completedCount = groups.filter((g) => Boolean(g.group.completed_at)).length;

  return (
    <PhaseSection
      title="모둠 미션 진행"
      heading="section"
      as="h2"
      subtitle="아이템 획득·미션 해결·최종 제출 현황입니다."
      headerExtra={
        !loading && groups.length > 0 ? (
          <PhaseSectionBadge>
            {completedCount}/{groups.length} 모둠 완료
          </PhaseSectionBadge>
        ) : null
      }
    >
      {loading ? (
        <LoadingState variant="section" label="불러오는 중…" />
      ) : groups.length === 0 ? (
        <p className={activityLayoutType.bodyMuted}>배정된 모둠이 없습니다.</p>
      ) : (
        <div className={activityCardGrid}>
          {groups.map((g) => (
            <GroupProgressCard key={g.group.id} entry={g} taskTotal={taskTotal} pack={pack} />
          ))}
        </div>
      )}
    </PhaseSection>
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
    <div className={activityNestedCard}>
      <div className="flex items-baseline justify-between gap-2">
        <p className={activityLayoutType.nestedCardHeader}>{group.name ?? "—"}</p>
        <span className={activityLayoutType.nestedCardBadge}>{memberCount}명</span>
      </div>
      <dl className="mt-2 space-y-1 text-xs @md:text-sm">
        <div className="flex justify-between gap-2">
          <dt className="text-[var(--muted-foreground)]">아이템</dt>
          <dd className="font-medium text-[var(--foreground)]">
            {acquired}/{itemTotal || "—"}
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-[var(--muted-foreground)]">미션</dt>
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
