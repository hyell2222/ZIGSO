"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type RankTier = "gold" | "silver" | "bronze" | "default";

function rankTier(rank: number): RankTier {
  if (rank === 1) return "gold";
  if (rank === 2) return "silver";
  if (rank === 3) return "bronze";
  return "default";
}

const tierMedal: Record<RankTier, string | null> = {
  gold: "🥇",
  silver: "🥈",
  bronze: "🥉",
  default: null,
};

const tierRankClass: Record<RankTier, string> = {
  gold: "text-[#8b6914]",
  silver: "text-[#4b5563]",
  bronze: "text-[#92400e]",
  default: "text-[var(--muted-foreground)]",
};

/** 리더보드 한 줄 — 카드 없이 밀도 높게 */
export function RankListRow({
  rank,
  title,
  score,
  centered = false,
  className,
}: {
  rank: number;
  title: string;
  score?: string;
  centered?: boolean;
  className?: string;
}) {
  const tier = rankTier(rank);
  const medal = tierMedal[tier];

  if (centered) {
    return (
      <div
        className={cn("flex flex-col items-center gap-1 py-2 text-center", className)}
        aria-label={`${title} ${rank}위`}
      >
        <span
          className={cn(
            "text-base font-bold tabular-nums leading-none",
            tierRankClass[tier],
          )}
        >
          {medal ?? `${rank}위`}
        </span>
        <p className="text-sm font-medium text-[var(--foreground)]">{title}</p>
        {score ? (
          <p className="text-xs font-bold tabular-nums text-[var(--primary)]">{score}</p>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className={cn("flex min-h-9 items-center gap-2.5", className)}
      aria-label={score ? `${title} ${rank}위 ${score}` : `${title} ${rank}위`}
    >
      <span
        className={cn(
          "w-9 shrink-0 text-center text-sm font-bold tabular-nums leading-none",
          tierRankClass[tier],
        )}
      >
        {medal ?? `${rank}위`}
      </span>
      <p className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--foreground)]">
        {title}
      </p>
      {score ? (
        <span className="shrink-0 text-sm font-bold tabular-nums text-[var(--primary)]">
          {score}
        </span>
      ) : null}
    </div>
  );
}

/** 항목 사이 구분선만 있는 컴팩트 목록 */
export function RankLeaderboard({
  children,
  className,
  bordered = false,
}: {
  children: ReactNode;
  className?: string;
  bordered?: boolean;
}) {
  return (
    <ol
      className={cn(
        "m-0 flex list-none flex-col divide-y divide-[var(--border)] p-0",
        bordered &&
          "rounded-lg border border-[var(--border)] bg-[var(--card-bg)] px-3 shadow-sm",
        className,
      )}
    >
      {children}
    </ol>
  );
}

export function RankLeaderboardItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <li className={cn("list-none py-0.5 first:pt-0 last:pb-0", className)}>{children}</li>;
}
