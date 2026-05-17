"use client";

import { useMemo } from "react";

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
};

type Props = {
  groups: GroupRow[];
  members: SessionResultsMember[];
  pack: ActivityPack | null;
  roleScopeKey?: string;
  loading?: boolean;
};

export function SessionResultsDashboard({
  groups,
  members,
  pack,
  roleScopeKey,
  loading,
}: Props) {
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
      })),
      roleScopeKey,
    );
  }, [pack, groups, members, roleScopeKey]);

  if (loading) {
    return <LoadingState variant="section" label="결과 집계 중…" />;
  }

  if (!results?.rankedTeams.length) {
    return (
      <p className="text-[11px] text-[var(--muted-foreground)] @md:text-sm">
        집계할 모둠 결과가 없습니다.
      </p>
    );
  }

  return (
    <section
      className={cn(
        "space-y-2 rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-2.5 shadow-[var(--elevation-sm)]",
        "@md:space-y-4 @md:p-4",
      )}
    >
      <header>
        <h2 className="text-xs font-semibold text-[var(--foreground)] @md:text-sm">
          STAD 모둠 순위
        </h2>
        <p className="mt-0.5 text-[11px] leading-snug text-[var(--muted-foreground)] @md:mt-1 @md:text-xs">
          전체 모둠 총점 순위와 모둠별 MVP입니다. 모둠원 개인 순위는 학생 화면에서만 확인할 수
          있습니다.
        </p>
      </header>
      <ol className="space-y-1.5 @md:space-y-3">
        {results.rankedTeams.map((team) => (
          <li
            key={team.groupId}
            className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-2 @md:p-3"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm font-mono font-bold text-[var(--primary)] @md:text-lg">
                {team.rank}위
              </p>
              <p className="text-[11px] font-medium text-[var(--foreground)] @md:text-sm @md:font-semibold">
                {team.groupName}
              </p>
              <p className="ml-auto font-mono text-sm font-semibold tabular-nums text-[var(--accent)] @md:text-lg @md:font-bold">
                {team.totalScore}점
              </p>
            </div>
            <p className="mt-0.5 text-[11px] text-[var(--muted-foreground)] @md:mt-1 @md:text-xs">
              항목 {team.itemsAcquired} · 미션 {team.tasksCompleted}
              {team.activityCompleted ? " · 최종 제출" : ""}
            </p>
            <div className="mt-1 rounded border border-[var(--border)] bg-[var(--tint-accent-weak)] px-1.5 py-1 @md:mt-2 @md:px-2 @md:py-1.5">
              <p className="text-[10px] font-semibold text-[var(--foreground)] @md:text-xs">
                MVP: {team.mvp.nickname}
                <span className="font-normal text-[var(--muted-foreground)]">
                  {" "}
                  · {team.mvp.roleLabel} · {team.mvp.totalScore}점
                </span>
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
