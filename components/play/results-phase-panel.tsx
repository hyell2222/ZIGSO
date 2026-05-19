"use client";

import { useMemo } from "react";

import { activityLayoutType } from "@/components/activity/activity-layout-typography";
import { PlayHeaderGroupPlace } from "@/components/play/play-header-group-place";
import { PlayPhaseShell } from "@/components/play/play-phase-shell";
import {
  activityNestedCard,
  activityPanelCard,
  activityStack,
} from "@/components/activity/activity-layout-chrome";
import { LoadingState } from "@/components/ui/loading-state";
import {
  getStudentResultsSnapshot,
  type SessionResultsSummary,
} from "@/lib/activity-pack/session-results";
import { PLAY_STUDENT_COPY } from "@/lib/play/student-copy";
import { cn } from "@/lib/utils";

const rankToneClass: Record<number, string> = {
  1: "text-[#b8860b]",
  2: "text-[#6b7280]",
  3: "text-[#a16207]",
};

type Props = {
  loading: boolean;
  title: string | null;
  results: SessionResultsSummary | null;
  highlightGroupId?: string | null;
  groupName?: string | null;
  roleLabel?: string | null;
  currentPlayerId?: string | null;
  contained?: boolean;
};

function RankCard({
  label,
  rank,
  total,
  totalUnit,
  score,
  scoreLabel,
  detail,
  accent,
}: {
  label: string;
  rank: number;
  total: number;
  totalUnit: string;
  score: number;
  scoreLabel: string;
  detail?: string;
  accent?: boolean;
}) {
  const tone = rankToneClass[rank];

  return (
    <article
      className={cn(
        activityNestedCard,
        accent && "border-[color-mix(in_srgb,var(--primary)_35%,var(--border))] bg-[var(--tint-accent-weak)]",
      )}
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 font-mono text-2xl font-bold leading-none tabular-nums @sm:text-3xl",
          tone,
        )}
      >
        {rank}
        <span className="text-[0.45em] font-semibold text-[var(--muted-foreground)]">위</span>
      </p>
      <p className="mt-1 text-sm text-[var(--muted-foreground)]">
        전체 {total}
        {totalUnit} 중
      </p>
      <p className="mt-3 font-mono text-lg font-bold tabular-nums text-[var(--foreground)] @sm:text-xl">
        {score}
        <span className="text-[0.5em] font-semibold text-[var(--muted-foreground)]">점</span>
      </p>
      <p className="mt-1 text-sm text-[var(--muted-foreground)]">{scoreLabel}</p>
      {detail ? (
        <p className="mt-2 text-xs leading-relaxed text-[var(--muted-foreground)]">{detail}</p>
      ) : null}
    </article>
  );
}

export function ResultsPhasePanel({
  loading,
  title,
  results,
  highlightGroupId,
  groupName,
  roleLabel,
  currentPlayerId,
  contained = false,
}: Props) {
  const snapshot = useMemo(
    () =>
      results
        ? getStudentResultsSnapshot(results, highlightGroupId, currentPlayerId)
        : null,
    [results, highlightGroupId, currentPlayerId],
  );

  const copy = PLAY_STUDENT_COPY.phaseResults;
  const sessionTitle = title?.trim() || null;
  const displayGroupName = groupName ?? snapshot?.groupName ?? null;
  const displayRoleLabel = roleLabel ?? snapshot?.roleLabel ?? null;

  const metaLine = [sessionTitle, displayGroupName, displayRoleLabel].filter(Boolean).join(" · ");

  return (
    <PlayPhaseShell
      contained={contained}
      mainClassName="max-w-2xl"
      header={{
        phase: 4,
        title: copy.title,
        description: metaLine ? `${copy.subtitle} · ${metaLine}` : copy.subtitle,
        rightSlot:
          displayGroupName || displayRoleLabel ? (
            <PlayHeaderGroupPlace
              groupName={displayGroupName}
              placeName={displayRoleLabel}
              placeLabel="나의 모둠"
              contained={contained}
            />
          ) : undefined,
      }}
    >
      {loading ? (
        <LoadingState variant="section" tone="play" label="결과 집계 중…" />
      ) : !snapshot ? (
        <p className={cn("py-8 text-center", activityLayoutType.bodyMuted)}>{copy.emptyMessage}</p>
      ) : (
        <div className={activityPanelCard}>
          <p className="text-center text-2xl @sm:text-3xl" aria-hidden>
            {copy.emoji}
          </p>
          <RankCard
            label={copy.groupRankLabel}
            rank={snapshot.groupRank}
            total={snapshot.totalTeams}
            totalUnit="개 모둠"
            score={snapshot.groupScore}
            scoreLabel={`${snapshot.groupName} · ${copy.groupScoreLabel}`}
            accent
          />
          <RankCard
            label={copy.personalRankLabel}
            rank={snapshot.personalRank}
            total={snapshot.totalPlayers}
            totalUnit="명"
            score={snapshot.personalScore}
            scoreLabel={copy.personalScoreLabel}
            detail={`${snapshot.roleLabel} · 전문가 ${snapshot.expertScore}점 · 팀 기여 ${snapshot.teamShareScore}점`}
          />
        </div>
      )}
    </PlayPhaseShell>
  );
}
