"use client";

import { useMemo } from "react";

import { LoadingState } from "@/components/ui/loading-state";
import { buildSessionResults } from "@/lib/activity-pack/session-results";
import type { ActivityPack } from "@/lib/activity-pack/types";
import type { GroupRow } from "@/lib/api/play";

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
  loading?: boolean;
};

export function SessionResultsDashboard({ groups, members, pack, loading }: Props) {
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
    );
  }, [pack, groups, members]);

  if (loading) {
    return <LoadingState variant="section" label="결과 집계 중…" />;
  }

  if (!results?.rankedTeams.length) {
    return (
      <p className="text-sm text-[var(--muted-foreground)]">집계할 모둠 결과가 없습니다.</p>
    );
  }

  return (
    <section className="space-y-4 rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-4 shadow-[var(--elevation-sm)]">
      <header>
        <h2 className="text-sm font-semibold text-[var(--foreground)]">STAD 모둠 순위</h2>
        <p className="mt-1 text-xs text-[var(--muted-foreground)]">
          전체 모둠 총점 순위와 모둠별 MVP입니다. 모둠원 개인 순위는 학생 화면에서만 확인할 수 있습니다.
        </p>
      </header>
      <ol className="space-y-3">
        {results.rankedTeams.map((team) => (
          <li
            key={team.groupId}
            className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-3"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-mono text-lg font-bold text-[var(--primary)]">{team.rank}위</p>
              <p className="font-semibold text-[var(--foreground)]">{team.groupName}</p>
              <p className="ml-auto font-mono text-lg font-bold tabular-nums text-[var(--accent)]">
                {team.totalScore}점
              </p>
            </div>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
              항목 {team.itemsAcquired} · 과제 {team.tasksCompleted}
              {team.activityCompleted ? " · 최종 제출" : ""}
            </p>
            <div className="mt-2 rounded border border-[var(--border)] bg-[var(--tint-accent-weak)] px-2 py-1.5">
              <p className="text-xs font-semibold text-[var(--foreground)]">
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
