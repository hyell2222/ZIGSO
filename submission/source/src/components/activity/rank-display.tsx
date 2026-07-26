"use client";

import { activityLayoutType } from "@/lib/theme/activity-layout-typography";
import { cn } from "@/lib/utils";

const t = activityLayoutType;

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
  default: "text-[var(--foreground)]",
};

const rankTileHighlightClass =
  "border-[color-mix(in_srgb,var(--primary)_38%,var(--border))] bg-[color-mix(in_srgb,var(--primary)_8%,var(--card-bg))]";
const rankTileDefaultClass = "border-[var(--border)] bg-[var(--card-bg)]";

function rankBadgeClass(tier: RankTier, rank: number) {
  const isMedal = tier !== "default";
  const width = "w-14";

  return cn(
    width,
    "shrink-0 text-center font-bold tabular-nums leading-none",
    isMedal ? "text-xl" : "text-base",
    tierRankClass[tier],
    "text-[var(--primary)]",
  );
}

/** 최종 순위 — ScoreTile과 동일한 가로형 카드 */
export function RankResultTile({
  label,
  rank,
  score,
  durationText,
  highlight,
  className,
}: {
  label: string;
  rank: number;
  score?: string;
  durationText?: string;
  highlight?: boolean;
  className?: string;
}) {
  const tier = rankTier(rank);
  const medal = tierMedal[tier];
  const rankLabel = medal ?? `${rank}위`;

  return (
    <div
      className={cn(
        "flex w-full items-center gap-3 rounded-lg border px-4 py-2.5",
        highlight ? rankTileHighlightClass : rankTileDefaultClass,
        className,
      )}
      aria-label={score ? `${label} ${rank}위 ${score}` : `${label} ${rank}위`}
    >
      <span className={rankBadgeClass(tier, rank)}>{rankLabel}</span>
      <p
        className={cn(
          "min-w-0 flex-1 truncate text-base font-bold text-[var(--foreground)]",
        )}
      >
        {label}
      </p>
      {durationText ? (
        <span className="shrink-0 text-xs text-[var(--muted-foreground)] tabular-nums w-20 text-right">
          {durationText}
        </span>
      ) : null}
      {score ? (
        <span
          className={cn(
            "shrink-0 text-base font-bold tabular-nums w-10 text-right",
            highlight ? "text-[var(--primary)]" : "text-[var(--foreground)]",
          )}
        >
          {score}
        </span>
      ) : null}
    </div>
  );
}
