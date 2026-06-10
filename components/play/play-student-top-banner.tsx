"use client";

import { ACTIVITY_LAYOUT_MAX, activityPageGutter, activityPageGutterContained } from "@/components/activity/activity-layout-chrome";
import { activityLayoutType } from "@/components/activity/activity-layout-typography";
import { PlayHeaderGroupPlace } from "@/components/play/play-header-group-place";
import {
  ACTIVITY_PHASE_LABELS,
  getPhaseStepDef,
  TEACHER_RESULTS_STEP,
  type TimedPhaseKey,
} from "@/lib/activity-phases";
import { cn } from "@/lib/utils";

type PlayBannerPhase = TimedPhaseKey | "results";

type Props = {
  phase: PlayBannerPhase;
  groupName: string | null;
  placeName: string | null;
  placeLabel?: string;
  pending?: boolean;
  contained?: boolean;
  completeTitle?: string;
  completeMessage?: string;
  className?: string;
};

/** 학생 play — 현재 단계 + 모둠·역할 + (선택) 완료 안내 */
export function PlayStudentTopBanner({
  phase,
  groupName,
  placeName,
  placeLabel = "역할",
  pending,
  contained = false,
  completeTitle,
  completeMessage,
  className,
}: Props) {
  const step =
    phase === "results"
      ? { number: TEACHER_RESULTS_STEP.number, title: ACTIVITY_PHASE_LABELS.results }
      : getPhaseStepDef(phase);
  const hasStatus = Boolean(completeTitle);

  return (
    <div
      className={cn(
        "w-full border-b border-[color-mix(in_srgb,var(--primary)_22%,var(--border))]",
        "bg-[color-mix(in_srgb,var(--primary)_10%,var(--play-panel))]",
        "shadow-[0_1px_0_color-mix(in_srgb,var(--primary)_8%,transparent)]",
        className,
      )}
    >
      <div
        className={cn(
          "mx-auto flex w-full items-center justify-between gap-3",
          ACTIVITY_LAYOUT_MAX,
          contained ? activityPageGutterContained : activityPageGutter,
          contained ? "py-2 @sm:py-2.5" : "py-2.5 @sm:gap-4 @sm:py-3",
        )}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2 @sm:gap-2.5">
          <span
            className={cn(
              "flex shrink-0 items-center justify-center rounded-full border-2 border-[var(--primary)] bg-[var(--primary)] font-bold text-[var(--on-primary)] tabular-nums",
              contained ? "h-7 w-7 text-xs" : "h-8 w-8 text-sm @md:h-9 @md:w-9",
            )}
          >
            {step.number}
          </span>
          <div className="min-w-0">
            <p
              className={cn(
                "truncate font-bold text-[var(--foreground)]",
                contained ? "text-base @sm:text-lg" : "text-base @sm:text-lg @md:text-xl",
              )}
            >
              {step.title}
            </p>
          </div>
        </div>
        <PlayHeaderGroupPlace
          variant="banner"
          groupName={groupName}
          placeName={placeName}
          placeLabel={placeLabel}
          pending={pending}
          contained={contained}
        />
      </div>
      {hasStatus ? (
        <div
          role="status"
          className={cn(
            "border-t border-[color-mix(in_srgb,var(--primary)_18%,var(--border))]",
            "bg-[color-mix(in_srgb,var(--primary)_6%,var(--play-panel))]",
            "text-center",
            contained ? "px-3 py-2" : "px-4 py-2 @sm:px-5 @sm:py-2.5",
          )}
        >
          <p
            className={cn(
              "font-bold text-[var(--primary)]",
              contained ? activityLayoutType.playPanelChip : "text-sm @sm:text-base",
            )}
          >
            {completeTitle}
          </p>
          {completeMessage ? (
            <p
              className={cn(
                "mt-1 text-[var(--muted-foreground)]",
                contained ? activityLayoutType.caption : activityLayoutType.playPanelBody,
              )}
            >
              {completeMessage}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
