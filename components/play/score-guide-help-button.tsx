"use client";

import { CircleHelp } from "lucide-react";

import { cn } from "@/lib/utils";

/** 점수·단계 라벨 옆 — 안내 모달 열기 */
export function ScoreGuideHelpButton({
  onClick,
  ariaLabel,
  className,
}: {
  onClick: () => void;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className={cn(
        "inline-flex h-5 w-5 items-center justify-center rounded-full",
        "text-[var(--muted-foreground)] transition-colors",
        "hover:bg-[var(--tint-primary-weak)] hover:text-[var(--primary)]",
        className,
      )}
    >
      <CircleHelp className="h-3.5 w-3.5" aria-hidden />
    </button>
  );
}
