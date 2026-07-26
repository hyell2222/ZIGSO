"use client";

import { Loader2, Timer } from "lucide-react";
import type { ReactNode } from "react";

import {
  activityBannerButtonClass,
  activityLayoutClasses,
  activityScrollBodyShell,
  activitySessionMetaShell,
} from "@/lib/theme/activity-layout-chrome";
import { activityLayoutType } from "@/lib/theme/activity-layout-typography";
import { ActivityPhaseStepper } from "@/components/activity/activity-phase-stepper";
import { PlayJoinQr } from "@/components/teacher/play-join-qr";
import { Button } from "@/components/ui/button";
import type { ActivityPhase } from "@/lib/api/activities";
import { isTimedPhase, RESULTS_COPY, type TimedPhaseKey, type PhaseGuideKey } from "@/lib/activity-pack/activity-phases";
import { cn } from "@/lib/utils";

type Props = {
  activityTitle: string | null;
  playerCount: number;
  joinCode: string;
  sessionEnded?: boolean;
  phase: ActivityPhase;
  buttonSize?: "default" | "sm";
  children: ReactNode;

  // Actions & States:
  sessionStarted?: boolean;
  hasNextPhase?: boolean;
  nextPhaseLabel?: string;
  hasReviewQuestions?: boolean;
  isTimerOpen?: boolean;
  startPending?: boolean;
  nextPending?: boolean;

  onTimerClick?: () => void;
  onStart?: () => void;
  onNext?: () => void;
  onReviewClick?: () => void;
};

/** 실세션 호스트·샌드박스 교사 패널 공통 레이아웃 */
export function SessionHostLayout({
  activityTitle,
  playerCount,
  joinCode,
  sessionEnded = false,
  phase,
  buttonSize = "default",
  children,

  sessionStarted = false,
  hasNextPhase = false,
  nextPhaseLabel = "다음 단계로",
  hasReviewQuestions = false,
  isTimerOpen = false,
  startPending = false,
  nextPending = false,

  onTimerClick,
  onStart,
  onNext,
  onReviewClick,
}: Props) {
  const layout = activityLayoutClasses();
  const showPhaseGuide = isTimedPhase(phase);

  const shouldShowTimer = showPhaseGuide;

  const timerButton = shouldShowTimer ? (
    <Button
      type="button"
      variant="secondary"
      size={buttonSize}
      className={cn("shrink-0", activityBannerButtonClass)}
      aria-haspopup="dialog"
      aria-expanded={isTimerOpen}
      onClick={onTimerClick}
    >
      <Timer className="h-4 w-4 shrink-0 text-[var(--accent)]" aria-hidden />
      타이머
    </Button>
  ) : null;

  const startButton = !sessionStarted ? (
    <Button
      type="button"
      size={buttonSize}
      className={activityBannerButtonClass}
      onClick={onStart}
      disabled={startPending}
    >
      {startPending ? (
        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[var(--primary)]" aria-hidden />
      ) : (
        "시작하기"
      )}
    </Button>
  ) : null;

  const nextButton =
    sessionStarted && !sessionEnded && hasNextPhase ? (
      <Button
        type="button"
        size={buttonSize}
        className={activityBannerButtonClass}
        onClick={onNext}
        disabled={nextPending}
      >
        {nextPending ? (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[var(--primary)]" aria-hidden />
        ) : (
          nextPhaseLabel
        )}
      </Button>
    ) : null;

  const reviewQuestionsButton =
    phase === "results" && hasReviewQuestions ? (
      <Button
        type="button"
        size={buttonSize}
        className={activityBannerButtonClass}
        onClick={onReviewClick}
      >
        {RESULTS_COPY.reviewQuestions}
      </Button>
    ) : null;

  const headerActionButton = reviewQuestionsButton ?? nextButton;

  const phaseActions = (
    <>
      {timerButton}
      {startButton}
      {headerActionButton}
    </>
  );

  const hasPhaseActions = Boolean(timerButton || startButton || headerActionButton);

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
                <PlayJoinQr joinCode={joinCode} variant="button" size={buttonSize} className="ml-0.5" />
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

      {showPhaseGuide ? (
        <ActivityPhaseStepper currentPhase={phase as PhaseGuideKey} className="shrink-0" />
      ) : null}

      <div className={activityScrollBodyShell}>
        <div
          className={cn(
            layout.pageBody,
            "flex flex-col pt-4 @sm:pt-6",
            phase === "waiting" && "items-center py-5 text-center @sm:py-6",
          )}
        >
          {children}
        </div>
      </div>
    </main>
  );
}
