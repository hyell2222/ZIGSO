"use client";

import type { ReactNode } from "react";

import type { ActivityPhase } from "@/lib/api/activities";
import { PHASE_GUIDES, PHASES } from "@/lib/teacher/phase-guide";
import { isResultsPhase } from "@/lib/activity-phases";
import { isTimedPhase } from "@/lib/teacher/phase-guide";
import { cn } from "@/lib/utils";

/**
 * 호스트 화면 단계 안내 카드 — 단계 번호 뱃지 + 제목 + 한 줄 설명.
 * `app/sessions/page.tsx` 와 시뮬레이션이 동일 외관으로 사용합니다.
 */
export function PhaseGuideCard({
  phase,
  meta,
}: {
  phase: ActivityPhase;
  meta?: ReactNode;
}) {
  if (phase === "waiting" || isResultsPhase(phase)) {
    return null;
  }

  if (!isTimedPhase(phase)) return null;

  const guide = PHASE_GUIDES[phase];
  const stepNumber = PHASES.find((s) => s.key === phase)?.number ?? 1;

  return (
    <div className="space-y-1 px-2 py-1 @md:space-y-2">
      {meta ? <div className="mt-0.5 @md:mt-1">{meta}</div> : null}
      <div className="flex items-center gap-2 @md:gap-2.5">
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[var(--primary)] bg-[var(--primary)] text-xs font-semibold tabular-nums text-[var(--on-primary)] shadow-sm @md:h-8 @md:w-8 @md:text-sm"
          aria-hidden
        >
          {stepNumber}
        </span>
        <h2 className="text-base font-bold leading-tight text-[var(--foreground)] @md:text-lg @md:leading-snug @lg:text-xl">
          {guide.title}
        </h2>
      </div>
      <p className="text-sm leading-snug text-[var(--muted-foreground)] @md:leading-relaxed">
        {guide.summary}
      </p>
    </div>
  );
}
