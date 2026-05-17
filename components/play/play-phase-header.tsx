"use client";

import { ClipboardList, Hourglass, Lightbulb, Puzzle, Trophy, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

const phaseIcon = {
  1: ClipboardList,
  2: Lightbulb,
  3: Puzzle,
  4: Trophy,
} as const;

export type PlayPhaseHeaderProps = {
  phase?: 1 | 2 | 3 | 4;
  /** `phase` 없을 때 표시 (예: 대기). 기본값은 `{phase}단계` */
  stepLabel?: string;
  icon?: LucideIcon;
  /** 짧은 단계 이름 (예: 활동 소개). 단계 번호는 위 오버라인에만 표시됩니다. */
  title: string;
  description: string;
  /** 예: 브리핑 우측 모둠 배지 */
  rightSlot?: ReactNode;
  className?: string;
  /** 샌드박스 패널 등 좁은 뷰에서 타이포·아이콘을 줄입니다 */
  compact?: boolean;
};

/**
 * 레이아웃 브레이크포인트는 앱 공통과 맞춤: 가로 정렬은 `sm:`(640px+)부터.
 * (`md:`만 쓰면 640–767px 구간이 세로 스택으로 남아 태블릿 세로와 불일치)
 */
export function PlayPhaseHeader({
  phase,
  stepLabel,
  icon: IconOverride,
  title,
  description,
  rightSlot,
  className,
  compact = false,
}: PlayPhaseHeaderProps) {
  const Icon = IconOverride ?? (phase ? phaseIcon[phase] : Hourglass);
  const overline = stepLabel ?? (phase != null ? `${phase}단계` : "대기");

  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row sm:items-center",
        compact ? "gap-1.5 sm:gap-3" : "gap-2.5 sm:gap-5",
        className,
      )}
    >
      <div
        className={cn(
          "flex min-w-0 flex-1 items-start",
          compact ? "gap-2 sm:gap-2.5" : "gap-3 sm:gap-4",
        )}
      >
        <span
          className={cn(
            "flex shrink-0 items-center justify-center rounded-2xl border-2 border-[color-mix(in_srgb,var(--primary)_18%,white)] bg-[color-mix(in_srgb,white_75%,var(--play-chip-cool))] text-[var(--primary)] shadow-[0_3px_0_color-mix(in_srgb,var(--primary)_12%,transparent)]",
            compact ? "h-7 w-7 sm:h-8 sm:w-8" : "h-8 w-8 sm:h-11 sm:w-11",
          )}
          aria-hidden
        >
          <Icon
            className={cn(
              compact ? "h-3.5 w-3.5 sm:h-4 sm:w-4" : "h-4 w-4 sm:h-6 sm:w-6",
            )}
          />
        </span>
        <div className="min-w-0 pt-0.5">
          <p
            className={cn(
              "font-semibold uppercase tracking-wider text-[var(--accent)]",
              compact ? "text-[10px] sm:text-[11px]" : "text-[11px] sm:text-xs",
            )}
          >
            {overline}
          </p>
          <h1
            className={cn(
              "font-bold leading-tight text-[var(--foreground)]",
              compact ? "text-sm sm:text-base sm:leading-snug" : "text-base sm:text-xl sm:leading-snug",
            )}
          >
            {title}
          </h1>
          <p
            className={cn(
              "max-w-2xl leading-relaxed text-[var(--muted-foreground)]",
              compact
                ? "mt-0 max-w-xl text-[11px] sm:mt-1 sm:text-xs"
                : "mt-0.5 text-[13px] sm:mt-1.5 sm:text-[0.95rem] sm:leading-relaxed",
            )}
          >
            {description}
          </p>
        </div>
      </div>
      {rightSlot ? (
        <div
          className={cn(
            "flex w-full min-w-0 justify-end self-start sm:ml-auto sm:w-auto sm:shrink-0 sm:self-center sm:pt-0",
            compact ? "pt-0 sm:pl-2" : "pt-0.5 sm:pl-4",
          )}
        >
          <div className="w-fit max-w-full">{rightSlot}</div>
        </div>
      ) : null}
    </div>
  );
}
