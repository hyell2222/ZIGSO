"use client";

import { useMemo } from "react";

import { LoadingState } from "@/components/ui/loading-state";
import type { ScenarioPack } from "@/lib/lunch/types";
import { scoreForHintStage } from "@/lib/lunch/scoring";
import type { TeamRow } from "@/lib/api/play";

export type TeamProgressGroup = {
  team: TeamRow;
  memberCount: number;
};

export function TeamProgressDashboard({
  groups,
  loading,
  pack,
}: {
  groups: TeamProgressGroup[];
  loading: boolean;
  pack: ScenarioPack | null;
}) {
  const menuTotal = pack?.menus.length ?? 0;

  return (
    <section className="space-y-3 rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-4 shadow-[var(--elevation-sm)]">
      <header>
        <h2 className="text-sm font-semibold text-[var(--foreground)]">팀 급식판 진행</h2>
        <p className="mt-1 text-xs text-[var(--muted-foreground)]">
          재료 획득·메뉴 완성·급식판 제출 현황입니다.
        </p>
      </header>
      {loading ? (
        <LoadingState variant="section" label="불러오는 중…" />
      ) : groups.length === 0 ? (
        <p className="text-sm text-[var(--muted-foreground)]">배정된 팀이 없습니다.</p>
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:gap-3 lg:grid-cols-3">
          {groups.map((g) => (
            <TeamProgressCard key={g.team.id} group={g} menuTotal={menuTotal} pack={pack} />
          ))}
        </div>
      )}
    </section>
  );
}

function TeamProgressCard({
  group,
  menuTotal,
  pack,
}: {
  group: TeamProgressGroup;
  menuTotal: number;
  pack: ScenarioPack | null;
}) {
  const { team, memberCount } = group;
  const acquired = team.acquired_ingredients.length;
  const ingredientTotal = pack?.ingredients.length ?? 0;
  const menusDone = team.completed_menus.length;
  const trayDone = Boolean(team.tray_submitted_at);

  const score = useMemo(() => {
    let total = 0;
    for (const a of team.acquired_ingredients) {
      total += scoreForHintStage(a.hintStageUsed);
    }
    for (const m of team.completed_menus) {
      total += m.score;
    }
    if (trayDone) total += 5;
    return total;
  }, [team.acquired_ingredients, team.completed_menus, trayDone]);

  return (
    <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-2.5 shadow-sm">
      <div className="flex items-baseline justify-between gap-2">
        <p className="font-mono text-lg font-semibold text-[var(--accent)]">{team.name ?? "—"}</p>
        <span className="text-[10px] text-[var(--muted-foreground)]">{memberCount}명</span>
      </div>
      <dl className="mt-2 space-y-1 text-[11px]">
        <div className="flex justify-between gap-2">
          <dt className="text-[var(--muted-foreground)]">재료</dt>
          <dd className="font-medium text-[var(--foreground)]">
            {acquired}/{ingredientTotal || "—"}
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-[var(--muted-foreground)]">메뉴</dt>
          <dd className="font-medium text-[var(--foreground)]">
            {menusDone}/{menuTotal || "—"}
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-[var(--muted-foreground)]">급식판</dt>
          <dd className={trayDone ? "font-semibold text-[var(--primary)]" : "text-[var(--muted-foreground)]"}>
            {trayDone ? "제출 완료" : "진행 중"}
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
