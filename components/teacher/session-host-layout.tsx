"use client";

import type { ReactNode } from "react";

import {
  activityLayoutClasses,
  activitySessionMetaShell,
} from "@/components/activity/activity-layout-chrome";
import { activityLayoutType } from "@/components/activity/activity-layout-typography";
import { PhaseGuideCard } from "@/components/teacher/phase-guide-card";
import { SessionHostJoinCard } from "@/components/teacher/session-host-join-card";
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
  contained?: boolean;
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
  contained = false,
}: Props) {
  const layout = activityLayoutClasses(contained);
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
        "relative mx-auto flex w-full flex-col space-y-0 overflow-hidden bg-[var(--background)]",
        contained ? "h-full min-h-0" : "h-dvh min-h-0",
      )}
    >
      <header
        className={cn(
          "w-full shrink-0",
          activitySessionMetaShell,
          !contained && "pt-[env(safe-area-inset-top,0px)]",
        )}
      >
        <div className={layout.sessionMetaInner}>
          <SessionHostJoinCard joinCode={joinCode} sessionEnded={sessionEnded} contained={contained} />
          <div className="min-w-0 flex-1 basis-full space-y-0.5 @sm:basis-auto">
            <h1
              className={cn(
                contained
                  ? activityLayoutType.activityTitleContained
                  : activityLayoutType.activityTitle,
              )}
            >
              {activityTitle ?? "시뮬레이션"}
            </h1>
            <p
              className={cn(
                "inline-flex items-center gap-1.5",
                contained ? activityLayoutType.activityMetaContained : activityLayoutType.activityMeta,
              )}
            >
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--primary)]"
                aria-hidden
              />
              접속{" "}
              <span className={activityLayoutType.activityMetaStrong}>
                {playerCount}
              </span>
              명
            </p>
          </div>
          {hasPhaseActions ? (
            <div
              className={cn(
                "ml-auto flex w-full flex-wrap items-stretch justify-end gap-2 @sm:w-auto",
                "[&_button]:min-h-10 [&_button]:touch-manipulation @md:[&_button]:min-h-11",
              )}
            >
              {phaseActions}
            </div>
          ) : null}
        </div>
      </header>

      <div
        className={cn(
          layout.pageBody,
          "min-h-0 flex-1 overflow-y-auto overscroll-y-contain",
          contained
            ? "pb-[max(1.5rem,env(safe-area-inset-bottom,0px))]"
            : "pb-[max(2.5rem,env(safe-area-inset-bottom,0px))]",
          phase === "waiting" &&
            "flex flex-col items-center p-5 text-center @sm:p-6",
        )}
      >
        {showPhaseGuide ? (
          <PhaseGuideCard phase={phase} contained={contained} />
        ) : null}
        {children}
      </div>
    </main>
  );
}
