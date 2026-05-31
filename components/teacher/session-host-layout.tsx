"use client";

import type { ReactNode } from "react";

import {
  activityLayoutClasses,
  activityPhaseHeaderShell,
  activitySessionMetaShell,
} from "@/components/activity/activity-layout-chrome";
import { PhaseSectionPanel } from "@/components/activity/phase-section-layout";
import { COPY_DEFAULTS } from "@/lib/copy/defaults";
import { activityLayoutType } from "@/components/activity/activity-layout-typography";
import { PhaseGuideCard } from "@/components/teacher/phase-guide-card";
import { SessionHostJoinCard } from "@/components/teacher/session-host-join-card";
import type { ActivityPhase } from "@/lib/api/activities";
import { isTimedPhase } from "@/lib/copy/teacher";
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
  const showPhaseActions = Boolean(timerButton || startButton || nextButton);
  const phaseActions = showPhaseActions ? (
    <>
      {timerButton}
      {startButton}
      {nextButton}
    </>
  ) : null;

  return (
    <main
      className={cn(
        "mx-auto w-full space-y-0",
        contained
          ? "pb-[max(1.5rem,env(safe-area-inset-bottom,0px))]"
          : "pb-[max(2.5rem,env(safe-area-inset-bottom,0px))]",
      )}
    >
      <header className={activitySessionMetaShell}>
        <div className={layout.sessionMetaInner}>
          <div className="min-w-0 flex-1 space-y-0.5">
            <h1
              className={cn(
                contained
                  ? activityLayoutType.activityTitleContained
                  : activityLayoutType.activityTitle,
              )}
            >
              {activityTitle ?? COPY_DEFAULTS.sandboxActivityTitle}
            </h1>
            <p
              className={cn(
                contained ? activityLayoutType.activityMetaContained : activityLayoutType.activityMeta,
              )}
            >
              접속{" "}
              <span className={activityLayoutType.activityMetaStrong}>
                {playerCount}
              </span>
              명
            </p>
          </div>
          <SessionHostJoinCard joinCode={joinCode} sessionEnded={sessionEnded} contained={contained} />
        </div>
      </header>

      {showPhaseGuide || showPhaseActions ? (
        <section className={activityPhaseHeaderShell}>
          <div className={layout.phaseHeaderInner}>
            {showPhaseGuide ? (
              <PhaseGuideCard
                phase={phase}
                contained={contained}
                rightSlot={
                  phaseActions ? (
                    <div
                      className={cn(
                        "flex w-full flex-wrap items-stretch justify-end gap-2",
                        "[&_button]:min-h-10 [&_button]:touch-manipulation @md:[&_button]:min-h-11",
                      )}
                    >
                      {phaseActions}
                    </div>
                  ) : null
                }
              />
            ) : (
              <div className="flex justify-end gap-2">{phaseActions}</div>
            )}
          </div>
        </section>
      ) : null}

      <div className={layout.pageBody}>
        <PhaseSectionPanel>{children}</PhaseSectionPanel>
      </div>
    </main>
  );
}
