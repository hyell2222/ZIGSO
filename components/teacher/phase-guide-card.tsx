"use client";

import type { ReactNode } from "react";

import type { ActivityPhase } from "@/lib/api/activities";
import { PHASE_GUIDES, PHASES } from "@/lib/teacher/phase-guide";
import { cn } from "@/lib/utils";

/**
 * 호스트 화면 단계 안내 카드 — 단계 번호 뱃지 + 제목 + 한 줄 설명.
 * `app/sessions/page.tsx` 와 시뮬레이션이 동일 외관으로 사용합니다.
 */
export function PhaseGuideCard({
  phase,
  meta,
  compact = false,
}: {
  phase: ActivityPhase;
  meta?: ReactNode;
  /** 좁은 임베드(샌드박스 패널 등)에서 제목·여백을 줄입니다 */
  compact?: boolean;
}) {
  if (phase === "waiting" || phase === "results") {
    return null;
  }

  const guide = PHASE_GUIDES[phase];
  const stepNumber = PHASES.find((s) => s.key === phase)?.number ?? 1;

  return (
    <div className={cn("px-2 py-1", compact ? "space-y-1" : "space-y-2")}>
      {meta ? <div className={compact ? "mt-0.5" : "mt-1"}>{meta}</div> : null}
      <div className={cn("flex items-center", compact ? "gap-2" : "gap-2.5")}>
        <span
          className={cn(
            "flex shrink-0 items-center justify-center rounded-full border border-[var(--primary)] bg-[var(--primary)] font-semibold tabular-nums text-[var(--on-primary)] shadow-sm",
            compact
              ? "h-6 w-6 text-[11px]"
              : "h-7 w-7 text-[12px] sm:h-8 sm:w-8 sm:text-sm",
          )}
          aria-hidden
        >
          {stepNumber}
        </span>
        <h2
          className={cn(
            "font-bold leading-tight text-[var(--foreground)]",
            compact
              ? "text-sm leading-snug sm:text-base md:text-lg"
              : "text-lg sm:text-xl md:text-2xl md:leading-snug",
          )}
        >
          {guide.title}
        </h2>
      </div>
      <p
        className={cn(
          "leading-snug text-[var(--muted-foreground)]",
          compact
            ? "text-[11px] leading-snug sm:text-xs"
            : "text-xs sm:text-sm sm:leading-relaxed",
        )}
      >
        {guide.summary}
      </p>
    </div>
  );
}
