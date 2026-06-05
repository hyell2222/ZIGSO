"use client";

import { Check } from "lucide-react";

import { PHASE_STEP_DEFS, TIMED_PHASE_ORDER, type TimedPhaseKey } from "@/lib/activity-phases";
import { cn } from "@/lib/utils";

type Props = {
  currentPhase: TimedPhaseKey;
  contained?: boolean;
  variant?: "play" | "teacher";
  className?: string;
};

type StepState = "complete" | "current" | "upcoming";

function stepStateAt(index: number, currentIndex: number): StepState {
  if (index < currentIndex) return "complete";
  if (index === currentIndex) return "current";
  return "upcoming";
}

export function ActivityPhaseStepper({
  currentPhase,
  contained = false,
  variant = "play",
  className,
}: Props) {
  const isTeacher = variant === "teacher";
  const currentIndex = TIMED_PHASE_ORDER.indexOf(currentPhase);

  const trackTop = isTeacher
    ? contained
      ? "top-4"
      : "top-[1.375rem] @md:top-6"
    : contained
      ? "top-4"
      : "top-5 @md:top-[1.375rem]";

  const circleSize = isTeacher
    ? contained
      ? "h-8 w-8 text-sm"
      : "h-11 w-11 text-base @md:h-12 @md:w-12 @md:text-lg"
    : contained
      ? "h-8 w-8 text-xs"
      : "h-10 w-10 text-sm @md:h-11 @md:w-11 @md:text-base";

  const checkSize = isTeacher
    ? contained
      ? "h-4 w-4"
      : "h-5 w-5 @md:h-6 @md:w-6"
    : contained
      ? "h-3.5 w-3.5"
      : "h-4 w-4 @md:h-5 @md:w-5";

  const labelSize = isTeacher
    ? contained
      ? "text-sm"
      : "text-base @sm:text-lg @md:text-xl"
    : contained
      ? "text-xs"
      : "text-sm @sm:text-base @md:text-lg";

  return (
    <nav
      aria-label="활동 단계"
      className={cn("w-full overflow-x-auto py-1 @md:py-1.5", className)}
    >
      <ol className="flex w-full min-w-[min(100%,20rem)] items-start justify-between">
        {PHASE_STEP_DEFS.map((step, index) => {
          const state = stepStateAt(index, currentIndex);
          const isFirst = index === 0;
          const isLast = index === PHASE_STEP_DEFS.length - 1;

          return (
            <li
              key={step.key}
              className="relative flex min-w-0 flex-1 flex-col items-center gap-2 px-0.5 @md:gap-2.5"
              aria-current={state === "current" ? "step" : undefined}
            >
              {!isFirst ? (
                <div
                  className={cn(
                    "absolute left-0 h-0.5 w-1/2 -translate-y-1/2 rounded-full",
                    trackTop,
                    index <= currentIndex
                      ? "bg-[var(--primary)]"
                      : isTeacher
                        ? "bg-[color-mix(in_srgb,var(--muted)_40%,var(--border))]"
                        : "bg-[var(--border)]",
                  )}
                  aria-hidden
                />
              ) : null}
              {!isLast ? (
                <div
                  className={cn(
                    "absolute right-0 h-0.5 w-1/2 -translate-y-1/2 rounded-full",
                    trackTop,
                    index < currentIndex
                      ? "bg-[var(--primary)]"
                      : isTeacher
                        ? "bg-[color-mix(in_srgb,var(--muted)_40%,var(--border))]"
                        : "bg-[var(--border)]",
                  )}
                  aria-hidden
                />
              ) : null}
              <span
                className={cn(
                  "relative z-10 flex shrink-0 items-center justify-center rounded-full border-2 font-semibold tabular-nums transition-colors",
                  circleSize,
                  state === "current" &&
                    "border-[var(--primary)] bg-[var(--primary)] text-[var(--on-primary)] shadow-sm",
                  state === "complete" &&
                    "border-[var(--primary)] bg-[color-mix(in_srgb,var(--primary)_12%,var(--card-bg))] text-[var(--primary)]",
                  state === "upcoming" &&
                    (isTeacher
                      ? "border-[var(--border)] bg-[var(--surface-overlay)] text-[var(--muted-foreground)]"
                      : "border-[var(--border)] bg-[var(--background)] text-[var(--muted-foreground)]"),
                )}
              >
                {state === "complete" ? (
                  <Check className={checkSize} aria-hidden />
                ) : (
                  step.number
                )}
              </span>
              <span
                className={cn(
                  "relative z-10 w-full text-center font-semibold leading-snug",
                  labelSize,
                  state === "current"
                    ? "text-[var(--primary)]"
                    : state === "complete"
                      ? "text-[var(--foreground)]"
                      : "text-[var(--muted-foreground)]",
                )}
              >
                {step.title}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}