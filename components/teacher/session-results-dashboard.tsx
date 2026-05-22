"use client";

import { useMemo } from "react";

import {
  activityCallout,
  activityNestedCard,
  activityStackTight,
} from "@/components/activity/activity-layout-chrome";
import { activityLayoutType } from "@/components/activity/activity-layout-typography";
import { PhaseSection, PhaseSectionBadge } from "@/components/activity/phase-section-layout";
import { LoadingState } from "@/components/ui/loading-state";
import { buildSessionResults } from "@/lib/activity-pack/session-results";
import type { ActivityPack } from "@/lib/activity-pack/types";
import type { GroupRow } from "@/lib/api/play";
import { cn } from "@/lib/utils";

export type SessionResultsMember = {
  id: string;
  nickname: string | null;
  groupId: string;
  assignedRoleId: string | null;
  assignedItemIds?: string[];
};

type Props = {
  groups: GroupRow[];
  members: SessionResultsMember[];
  pack: ActivityPack | null;
  roleScopeKey?: string;
  loading?: boolean;
  contained?: boolean;
};

export function SessionResultsDashboard({
  groups,
  members,
  pack,
  roleScopeKey,
  loading,
  contained = false,
}: Props) {
  void contained;

  const results = useMemo(() => {
    if (!pack) return null;
    return buildSessionResults(
      pack,
      groups.map((g) => ({
        id: g.id,
        name: g.name,
        acquired_items: g.acquired_items,
        completed_tasks: g.completed_tasks,
        completed_at: g.completed_at,
      })),
      members.map((m) => ({
        id: m.id,
        nickname: m.nickname,
        groupId: m.groupId,
        assignedRoleId: m.assignedRoleId,
        assignedItemIds: m.assignedItemIds,
      })),
      roleScopeKey,
    );
  }, [pack, groups, members, roleScopeKey]);

  if (loading) {
    return <LoadingState variant="section" label="결과 집계 중…" />;
  }

  if (!results?.rankedTeams.length) {
    return <p className={activityLayoutType.bodyMuted}>집계할 모둠 결과가 없습니다.</p>;
  }

  return (
    <PhaseSection
      title="모둠 순위"
      heading="section"
      as="h2"
      subtitle="전체 모둠 총점 순위와 모둠별 MVP입니다. 모둠원 개인 순위는 학생 화면에서만 확인할 수 있습니다."
      headerExtra={
        <PhaseSectionBadge>{results.rankedTeams.length}개 모둠</PhaseSectionBadge>
      }
    >
      <ol className={activityStackTight}>
        {results.rankedTeams.map((team) => (
          <li key={team.groupId} className={activityNestedCard}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className={activityLayoutType.nestedCardLead}>{team.rank}위</p>
              <p className={activityLayoutType.nestedCardTitle}>{team.groupName}</p>
              <p className={cn(activityLayoutType.nestedCardScore, "ml-auto")}>{team.totalScore}점</p>
            </div>
            <p className={activityLayoutType.nestedCardMeta}>
              아이템 {team.itemsAcquired} · 미션 {team.tasksCompleted}
              {team.activityCompleted ? " · 최종 제출" : ""}
            </p>
            <div className={cn(activityCallout, "mt-2 px-3 py-2")}>
              <p className={activityLayoutType.nestedCardFootnote}>
                <span className={activityLayoutType.nestedCardFootnoteLabel}>MVP</span>
                <span className={activityLayoutType.nestedCardFootnoteStrong}>
                  {" "}
                  {team.mvp.nickname}
                </span>
                {" · "}
                {team.mvp.roleLabel} · {team.mvp.totalScore}점
              </p>
            </div>
          </li>
        ))}
      </ol>
    </PhaseSection>
  );
}
