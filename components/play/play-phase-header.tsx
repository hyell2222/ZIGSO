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
};

/** 패널 너비 기준 반응형 — 샌드박스 분할 창·모바일 동일 (@container 부모 필요) */
export function PlayPhaseHeader({
  phase,
  stepLabel,
  icon: IconOverride,
  title,
  description,
  rightSlot,
  className,
}: PlayPhaseHeaderProps) {
  const Icon = IconOverride ?? (phase ? phaseIcon[phase] : Hourglass);
  const overline = stepLabel ?? (phase != null ? `${phase}단계` : "대기");

  return (
    <div className={cn("flex flex-col gap-2.5 @md:flex-row @md:items-center @md:gap-5", className)}>
      <div className="flex min-w-0 flex-1 items-start gap-3 @sm:gap-4">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl border-2 border-[color-mix(in_srgb,var(--primary)_18%,white)] bg-[color-mix(in_srgb,white_75%,var(--play-chip-cool))] text-[var(--primary)] shadow-[0_3px_0_color-mix(in_srgb,var(--primary)_12%,transparent)] @sm:h-9 @sm:w-9 @md:h-11 @md:w-11"
          aria-hidden
        >
          <Icon className="h-4 w-4 @sm:h-5 @sm:w-5 @md:h-6 @md:w-6" />
        </span>
        <div className="min-w-0 pt-0.5">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)] @md:text-sm">
            {overline}
          </p>
          <h1 className="text-lg font-bold leading-tight text-[var(--foreground)] @md:text-xl @md:leading-snug">
            {title}
          </h1>
          <p className="mt-0.5 max-w-2xl text-sm leading-relaxed text-[var(--muted-foreground)] @md:mt-1.5 @md:text-base @md:leading-relaxed">
            {description}
          </p>
        </div>
      </div>
      {rightSlot ? (
        <div className="flex w-full min-w-0 justify-end self-start pt-0.5 @md:ml-auto @md:w-auto @md:shrink-0 @md:self-center @md:pt-0 @md:pl-4">
          <div className="w-fit max-w-full">{rightSlot}</div>
        </div>
      ) : null}
    </div>
  );
}
