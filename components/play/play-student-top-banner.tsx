"use client";

import {
  appNavContentShell,
  activityPlayStudentHeaderRowContained,
} from "@/components/activity/activity-layout-chrome";
import { activityLayoutType } from "@/components/activity/activity-layout-typography";
import { PlayHeaderGroupPlace } from "@/components/play/play-header-group-place";
import {
  ACTIVITY_PHASE_LABELS,
  getPhaseStepDef,
  getPhaseStepGuide,
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
  completeTitle,
  completeMessage,
  className,
}: Props) {
  const step =
    phase === "results"
      ? { number: TEACHER_RESULTS_STEP.number, title: ACTIVITY_PHASE_LABELS.results }
      : getPhaseStepDef(phase);
  const hasStatus = Boolean(completeTitle);
  const guide = getPhaseStepGuide(phase);

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
        className={cn(appNavContentShell, activityPlayStudentHeaderRowContained, "justify-between py-2 sm:py-2.5")}
      >
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[var(--primary)] bg-[var(--primary)] text-[0.6rem] font-bold tabular-nums text-[var(--on-primary)]">
              {step.number}
            </span>
            <p className="truncate text-base font-bold text-[var(--primary)]">
              {step.title}
            </p>
          </div>
          {/* 가이드 설명글을 step 타이틀 아래에 한두 줄 텍스트로 항시 노출 */}
          <p className="text-[14px] leading-relaxed text-[var(--muted-foreground)] font-medium max-w-xl">
            {guide.intro}
          </p>
        </div>
        <PlayHeaderGroupPlace
          groupName={groupName}
          placeName={placeName}
          placeLabel={placeLabel}
          pending={pending}
        />
      </div>
      {hasStatus ? (
        <div
          role="status"
          className={cn(
            "border-t border-[color-mix(in_srgb,var(--primary)_18%,var(--border))]",
            "bg-[color-mix(in_srgb,var(--primary)_6%,var(--play-panel))]",
            "py-2 text-center",
            appNavContentShell,
          )}
        >
          <p className={cn("font-bold text-[var(--primary)]", activityLayoutType.playPanelChip)}>
            {completeTitle}
          </p>
          {completeMessage ? (
            <p className={cn("mt-1 text-[var(--muted-foreground)]", activityLayoutType.caption)}>
              {completeMessage}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
