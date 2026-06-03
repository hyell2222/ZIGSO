"use client";

import {
  activityCardGrid,
  activityNestedCard,
} from "@/components/activity/activity-layout-chrome";
import { activityLayoutType } from "@/components/activity/activity-layout-typography";
import { PhaseSection, PhaseSectionBadge } from "@/components/activity/phase-section-layout";
import { LoadingState } from "@/components/ui/loading-state";

export type GroupProgressMember = {
  id: string;
  nickname: string | null;
  baseScore: number | null;
  practiceSubmitted: boolean;
};

export type GroupProgressGroup = {
  group: { id: string; name: string | null };
  members: GroupProgressMember[];
};

export function GroupProgressDashboard({
  groups,
  loading,
  contained = false,
}: {
  groups: GroupProgressGroup[];
  loading: boolean;
  contained?: boolean;
}) {
  void contained;

  const totalMembers = groups.reduce((s, g) => s + g.members.length, 0);
  const doneMembers = groups.reduce(
    (s, g) => s + g.members.filter((m) => m.practiceSubmitted).length,
    0,
  );

  return (
    <PhaseSection
      title="전문가 연습 진행"
      heading="section"
      as="h2"
      subtitle="모둠별 연습 문제 완료·기준 점수 현황"
      headerExtra={
        !loading && totalMembers > 0 ? (
          <PhaseSectionBadge>
            {doneMembers}/{totalMembers} 명 완료
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
            <GroupProgressCard key={g.group.id} entry={g} />
          ))}
        </div>
      )}
    </PhaseSection>
  );
}

function GroupProgressCard({ entry }: { entry: GroupProgressGroup }) {
  const { group, members } = entry;
  const doneList = members.filter((m) => m.practiceSubmitted);
  const baseScores = doneList
    .map((m) => m.baseScore ?? 0)
    .filter((n) => Number.isFinite(n));
  const avgBase =
    baseScores.length > 0
      ? Math.round(baseScores.reduce((s, n) => s + n, 0) / baseScores.length)
      : null;

  return (
    <div className={activityNestedCard}>
      <div className="flex items-baseline justify-between gap-2">
        <p className={activityLayoutType.nestedCardHeader}>{group.name ?? "—"}</p>
        <span className={activityLayoutType.nestedCardBadge}>{members.length}명</span>
      </div>
      <dl className="mt-2 space-y-1 text-xs @md:text-sm">
        <div className="flex justify-between gap-2">
          <dt className="text-[var(--muted-foreground)]">연습 완료</dt>
          <dd className="font-medium text-[var(--foreground)]">
            {doneList.length}/{members.length}
          </dd>
        </div>
        <div className="flex justify-between gap-2 border-t border-[var(--border)] pt-1">
          <dt className="text-[var(--muted-foreground)]">평균 기준 점수</dt>
          <dd className="font-semibold tabular-nums text-[var(--primary)]">
            {avgBase != null ? `${avgBase}점` : "—"}
          </dd>
        </div>
      </dl>
    </div>
  );
}
