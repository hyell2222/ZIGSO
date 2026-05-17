"use client";

import { useMemo } from "react";

import { PlayPhaseShell } from "@/components/play/play-phase-shell";
import { playSurfaceCool } from "@/components/play/play-atmosphere";
import { Button } from "@/components/ui/button";
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
  embedded?: boolean;
  onLeave?: () => void;
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
        "rounded-xl border-2 px-4 py-4",
        accent
          ? "border-[color-mix(in_srgb,var(--primary)_35%,var(--border))] bg-[var(--tint-accent-weak)]"
          : "border-[var(--border)] bg-[var(--background)]",
      )}
    >
      <p className="text-xs font-bold uppercase tracking-wider text-[var(--accent)]">{label}</p>
      <p className={cn("mt-1 font-mono text-4xl font-extrabold leading-none tabular-nums", tone)}>
        {rank}
        <span className="text-[0.45em] font-bold text-[var(--muted-foreground)]">위</span>
      </p>
      <p className="mt-1 text-sm text-[var(--muted-foreground)]">
        전체 {total}
        {totalUnit} 중
      </p>
      <p className="mt-3 font-mono text-2xl font-bold tabular-nums text-[var(--foreground)]">
        {score}
        <span className="text-[0.5em] font-semibold text-[var(--muted-foreground)]">점</span>
      </p>
      <p className="mt-1 text-sm text-[var(--muted-foreground)]">{scoreLabel}</p>
      {detail ? <p className="mt-2 text-xs leading-relaxed text-[var(--muted-foreground)]">{detail}</p> : null}
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
  embedded = false,
  onLeave,
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

  return (
    <PlayPhaseShell embedded={embedded} mainClassName="max-w-2xl">
      {loading ? (
        <LoadingState variant="section" tone="play" label="결과 집계 중…" />
      ) : !snapshot ? (
        <p className="py-8 text-center text-sm text-[var(--muted-foreground)]">{copy.emptyMessage}</p>
      ) : (
        <div className={cn("space-y-4", playSurfaceCool, "px-4 py-5 sm:px-5 sm:py-6")}>
          <div className="text-center">
            <p className="text-3xl" aria-hidden>
              {copy.emoji}
            </p>
            <h1 className="mt-2 text-xl font-bold text-[var(--foreground)] sm:text-2xl">{copy.title}</h1>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">{copy.subtitle}</p>
            {sessionTitle ? (
              <p className="mt-2 text-sm font-medium text-[var(--muted-foreground)]">{sessionTitle}</p>
            ) : null}
            {displayGroupName || displayRoleLabel ? (
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                {[displayGroupName, displayRoleLabel].filter(Boolean).join(" · ")}
              </p>
            ) : null}
          </div>
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
          {onLeave ? (
            <Button type="button" className="w-full touch-manipulation" variant="outline" onClick={onLeave}>
              {copy.leaveButton}
            </Button>
          ) : null}
        </div>
      )}
    </PlayPhaseShell>
  );
}
