"use client";

import type { ReactNode } from "react";

import {
  activityLayoutClasses,
  activityScrollBodyShell,
  activitySessionMetaShell,
} from "@/components/activity/activity-layout-chrome";
import { activityLayoutType } from "@/components/activity/activity-layout-typography";
import { PhaseGuideCard } from "@/components/teacher/phase-guide-card";
import { PlayJoinQr } from "@/components/teacher/play-join-qr";
import type { ActivityPhase } from "@/lib/api/activities";
import { isTimedPhase } from "@/lib/activity-phases";
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
  const layout = activityLayoutClasses();
  const showPhaseGuide = isTimedPhase(phase);
  const phaseActions = (
    <>
      {timerButton}
      {startButton}
      {nextButton}
    </>
  );
  const hasPhaseActions = Boolean(timerButton || startButton || nextButton);

  return (
    <main
      className={cn(
        layout.layoutFrame,
        "bg-[var(--background)]",
        "flex min-h-0 flex-1 flex-col",
      )}
    >
      <header className={cn("w-full shrink-0", activitySessionMetaShell)}>
        <div className={layout.sessionMetaInner}>
          <div className="min-w-0 flex-1 basis-full space-y-2 @sm:basis-auto">
            <h1 className={activityLayoutType.activityTitleContained}>
              {activityTitle ?? "시뮬레이션"}
            </h1>
            <div
              className={cn(
                "inline-flex flex-wrap items-center gap-x-3 gap-y-2",
                activityLayoutType.activityMetaContained,
              )}
            >
              {!sessionEnded ? (
                <PlayJoinQr joinCode={joinCode} variant="button" className="ml-0.5" />
              ) : null}

              <span className="inline-flex items-center gap-1.5">
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--primary)]"
                  aria-hidden
                />
                접속{" "}
                <span className={activityLayoutType.activityMetaStrong}>
                  {playerCount}
                </span>
                명
              </span>
            </div>
          </div>
          {hasPhaseActions ? (
            <div
              className={cn(
                "ml-auto flex w-full flex-wrap items-end justify-end gap-2 @sm:w-auto",
                "[&_button]:touch-manipulation",
              )}
            >
              {phaseActions}
            </div>
          ) : null}
        </div>
      </header>

      <div className={activityScrollBodyShell}>
        <div
          className={cn(
            layout.pageBody,
            "flex flex-col",
            phase === "waiting" && "items-center py-5 text-center @sm:py-6",
          )}
        >
          {showPhaseGuide ? <PhaseGuideCard phase={phase} /> : null}
          {children}
        </div>
      </div>
    </main>
  );
}
