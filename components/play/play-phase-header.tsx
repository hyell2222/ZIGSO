"use client";

import { ClipboardList, FileSearch, MapPinned } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

const phaseIcon = {
  1: FileSearch,
  2: MapPinned,
  3: ClipboardList,
} as const;

export type PlayPhaseHeaderProps = {
  phase: 1 | 2 | 3;
  /** 짧은 단계 이름 (예: 사건 파악). 단계 번호는 위 오버라인에만 표시됩니다. */
  title: string;
  description: string;
  /** 예: 브리핑 우측 팀 배지 */
  rightSlot?: ReactNode;
  className?: string;
  /** 샌드박스 패널 등 좁은 뷰에서 타이포·아이콘을 줄입니다 */
  compact?: boolean;
};

export function PlayPhaseHeader({
  phase,
  title,
  description,
  rightSlot,
  className,
  compact = false,
}: PlayPhaseHeaderProps) {
  const Icon = phaseIcon[phase];

  return (
    <div
      className={cn(
        "flex flex-col md:flex-row md:items-center md:justify-between",
        compact ? "gap-1.5 md:gap-3" : "gap-2.5 md:gap-5",
        className,
      )}
    >
      <div
        className={cn(
          "flex min-w-0 flex-1 items-start",
          compact ? "gap-2 md:gap-2.5" : "gap-3 md:gap-4",
        )}
      >
        <span
          className={cn(
            "flex shrink-0 items-center justify-center rounded-lg bg-[var(--play-chip-cool)] text-[var(--primary)] shadow-sm ring-1 ring-[color-mix(in_srgb,var(--primary)_22%,transparent)]",
            compact ? "h-7 w-7 md:h-8 md:w-8" : "h-8 w-8 md:h-11 md:w-11",
          )}
          aria-hidden
        >
          <Icon
            className={cn(
              compact ? "h-3.5 w-3.5 md:h-4 md:w-4" : "h-4 w-4 md:h-6 md:w-6",
            )}
          />
        </span>
        <div className="min-w-0 pt-0.5">
          <p
            className={cn(
              "font-semibold uppercase tracking-wider text-[var(--accent)]",
              compact ? "text-[10px] md:text-[11px]" : "text-[11px] md:text-xs",
            )}
          >
            {phase}단계
          </p>
          <h1
            className={cn(
              "font-bold leading-tight text-[var(--foreground)]",
              compact ? "text-sm md:text-base md:leading-snug" : "text-base md:text-xl md:leading-snug",
            )}
          >
            {title}
          </h1>
          <p
            className={cn(
              "max-w-2xl leading-relaxed text-[var(--muted-foreground)]",
              compact
                ? "mt-0 max-w-xl text-[11px] md:mt-1 md:text-xs"
                : "mt-0.5 text-[13px] md:mt-1.5 md:text-[0.95rem] md:leading-relaxed",
            )}
          >
            {description}
          </p>
        </div>
      </div>
      {rightSlot ? (
        <div
          className={cn(
            "flex w-full min-w-0 justify-end self-start md:w-auto md:shrink-0 md:self-center md:pt-0",
            compact ? "pt-0 md:pl-2" : "pt-0.5 md:pl-4",
          )}
        >
          <div className="w-fit max-w-full">{rightSlot}</div>
        </div>
      ) : null}
    </div>
  );
}
