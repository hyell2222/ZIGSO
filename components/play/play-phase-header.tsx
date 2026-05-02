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
};

export function PlayPhaseHeader({
  phase,
  title,
  description,
  rightSlot,
  className,
}: PlayPhaseHeaderProps) {
  const Icon = phaseIcon[phase];

  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--play-chip-cool)] text-[var(--primary)] shadow-sm ring-1 ring-[color-mix(in_srgb,var(--primary)_22%,transparent)]"
          aria-hidden
        >
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 pt-0.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--accent)]">
            {phase}단계
          </p>
          <h1 className="text-lg font-bold leading-tight text-[var(--foreground)]">{title}</h1>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[var(--muted-foreground)]">
            {description}
          </p>
        </div>
      </div>
      {rightSlot ? <div className="shrink-0 self-start sm:self-center">{rightSlot}</div> : null}
    </div>
  );
}
