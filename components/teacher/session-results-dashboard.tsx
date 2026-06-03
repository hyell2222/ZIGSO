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
  baseScore?: number | null;
  individual_quiz_answers?: import("@/lib/activity-pack/types").QuizAnswer[];
  individual_quiz_submitted_at?: string | null;
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
      })),
      members.map((m) => ({
        id: m.id,
        nickname: m.nickname,
        groupId: m.groupId,
        assignedRoleId: m.assignedRoleId,
        baseScore: m.baseScore,
        individual_quiz_answers: m.individual_quiz_answers,
        individual_quiz_submitted_at: m.individual_quiz_submitted_at,
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
      title="모둠 순위 (STAD)"
      heading="section"
      as="h2"
      subtitle="모둠별 집단 점수(평균 향상 점수)와 MVP. 개인 순위는 학생 화면에서 확인합니다."
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
              <p className={cn(activityLayoutType.nestedCardScore, "ml-auto")}>{team.teamScore}점</p>
            </div>
            <p className={activityLayoutType.nestedCardMeta}>
              집단 점수 = 모둠원 향상 점수 평균 · {team.memberCount}명
            </p>
            <div className={cn(activityCallout, "mt-2 px-3 py-2")}>
              <p className={activityLayoutType.nestedCardFootnote}>
                <span className={activityLayoutType.nestedCardFootnoteLabel}>MVP</span>
                <span className={activityLayoutType.nestedCardFootnoteStrong}>
                  {" "}
                  {team.mvp.nickname}
                </span>
                {" · "}
                {team.mvp.roleLabel} · 향상 {team.mvp.improvementPoints}점 (실전 {team.mvp.testScore}점)
              </p>
            </div>
          </li>
        ))}
      </ol>
    </PhaseSection>
  );
}
