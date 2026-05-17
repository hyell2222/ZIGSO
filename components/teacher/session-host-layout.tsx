"use client";

import type { ReactNode } from "react";

import { PhaseGuideCard } from "@/components/teacher/phase-guide-card";
import { SessionHostJoinCard } from "@/components/teacher/session-host-join-card";
import type { ActivityPhase } from "@/lib/api/activities";
import { isTimedPhase } from "@/lib/teacher/phase-guide";
import { cn } from "@/lib/utils";

type Props = {
  activityTitle: string | null;
  playerCount: number;
  joinCode: string;
  sessionEnded?: boolean;
  phase: ActivityPhase;
  timerButton?: ReactNode;
  startButton?: ReactNode;
  nextButton?: ReactNode;
  children: ReactNode;
};

/** 실세션 호스트·샌드박스 교사 패널 공통 레이아웃 */
export function SessionHostLayout({
  activityTitle,
  playerCount,
  joinCode,
  sessionEnded = false,
  phase,
  timerButton,
  startButton,
  nextButton,
  children,
}: Props) {
  const showPhaseGuide = isTimedPhase(phase);
  const showPhaseActions = Boolean(timerButton || startButton || nextButton);

  return (
    <main
      className={cn(
        "mx-auto w-full max-w-full space-y-3 px-3 py-3 pb-[max(2.5rem,env(safe-area-inset-bottom,0px))]",
        "@sm:space-y-4 @sm:px-4 @sm:pt-5",
        "@md:max-w-7xl @md:space-y-6 @md:px-8 @md:pb-12 @md:pt-8",
      )}
    >
      <header
        className={cn(
          "flex flex-col gap-2 border-b border-[var(--border)] pb-3",
          "@sm:flex-row @sm:items-center @sm:justify-between",
          "@md:flex-row @md:flex-wrap @md:items-start @md:gap-5 @md:pb-4",
        )}
      >
        <div className="min-w-0 flex-1 space-y-0.5 @md:space-y-1">
          <p
            className={cn(
              "break-words font-mono text-2xl font-semibold leading-tight tracking-wide text-[var(--accent)]",
              "@md:text-3xl @lg:text-4xl @lg:leading-none @xl:text-[3.5rem]",
            )}
          >
            {activityTitle ?? "시뮬레이션"}
          </p>
          <p className="text-xs text-[var(--muted-foreground)] @md:px-0.5 @md:text-sm">
            접속 <span className="font-semibold text-[var(--foreground)]">{playerCount}</span>명
          </p>
        </div>
        <SessionHostJoinCard joinCode={joinCode} sessionEnded={sessionEnded} />
      </header>

      {showPhaseGuide || showPhaseActions ? (
        <div
          className={cn(
            "flex flex-col gap-2 @md:flex-row @md:flex-wrap @md:items-center",
            "@md:gap-4 @lg:flex-nowrap",
          )}
        >
          <div className="min-w-0 flex-1 @md:max-w-[min(100%,42rem)]">
            {showPhaseGuide ? <PhaseGuideCard phase={phase} /> : null}
          </div>
          {showPhaseActions ? (
            <div
              className={cn(
                "flex w-full shrink-0 flex-wrap items-stretch justify-end gap-1.5 @md:ml-auto @md:w-auto",
                "@md:gap-3 [&_button]:min-h-11 [&_button]:touch-manipulation",
              )}
            >
              {timerButton}
              {startButton}
              {nextButton}
            </div>
          ) : null}
        </div>
      ) : null}

      {children}
    </main>
  );
}
