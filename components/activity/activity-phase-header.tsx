"use client";

import type { ReactNode } from "react";

import { activityLayoutType } from "@/components/activity/activity-layout-typography";
import { cn } from "@/lib/utils";

export type ActivityPhaseHeaderProps = {
  stepNumber?: number | null;
  stepLabel?: string;
  title: string;
  description: string;
  rightSlot?: ReactNode;
  contained?: boolean;
  as?: "h1" | "h2";
  className?: string;
  meta?: ReactNode;
};

function PhaseStepBadge({
  stepNumber,
  contained,
}: {
  stepNumber: number;
  contained?: boolean;
}) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full border border-[var(--primary)] bg-[var(--primary)] font-semibold tabular-nums text-[var(--on-primary)] shadow-sm",
        contained
          ? "h-7 w-7 text-xs @md:h-8 @md:w-8 @md:text-sm"
          : "h-9 w-9 text-sm @md:h-10 @md:w-10 @md:text-base",
      )}
      aria-hidden
    >
      {stepNumber}
    </span>
  );
}

export function ActivityPhaseHeader({
  stepNumber = null,
  stepLabel,
  title,
  description,
  rightSlot,
  contained = false,
  as: Heading = "h1",
  className,
  meta,
}: ActivityPhaseHeaderProps) {
  const overline =
    stepLabel ?? (stepNumber != null ? `${stepNumber}단계` : "단계");
  const showBadge = stepNumber != null;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {meta ? <div>{meta}</div> : null}
      <div className="flex flex-col gap-2.5 @md:flex-row @md:items-center @md:gap-5">
        <div className="flex min-w-0 flex-1 items-start gap-3 @sm:gap-3.5">
          {showBadge ? <PhaseStepBadge stepNumber={stepNumber} contained={contained} /> : null}
          <div className="min-w-0 pt-0.5">
            <p className={activityLayoutType.phaseStep}>{overline}</p>
            <Heading
              className={cn(
                contained ? activityLayoutType.phaseTitle : activityLayoutType.phaseTitleExpanded,
              )}
            >
              {title}
            </Heading>
            <p
              className={cn(
                "mt-0.5 max-w-2xl",
                contained
                  ? activityLayoutType.phaseDescription
                  : activityLayoutType.phaseDescriptionExpanded,
              )}
            >
              {description}
            </p>
          </div>
        </div>
        {rightSlot ? (
          <div className="flex w-full min-w-0 justify-end self-start @md:ml-auto @md:w-auto @md:shrink-0 @md:self-center">
            <div className="w-fit max-w-full">{rightSlot}</div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
