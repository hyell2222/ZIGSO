"use client";

import { Check } from "lucide-react";

import { PhaseGuideHelpButton } from "@/components/activity/phase-guide-help-button";
import { PHASE_STEP_DEFS, TIMED_PHASE_ORDER, type TimedPhaseKey } from "@/lib/activity-phases";
import { cn } from "@/lib/utils";

type Props = {
  currentPhase: TimedPhaseKey;
  className?: string;
};

type StepState = "complete" | "current" | "upcoming";

type StepDef = (typeof PHASE_STEP_DEFS)[number];

function stepStateAt(index: number, currentIndex: number): StepState {
  if (index < currentIndex) return "complete";
  if (index === currentIndex) return "current";
  return "upcoming";
}

function connectorClass(active: boolean) {
  return active
    ? "bg-[var(--primary)]"
    : "bg-[color-mix(in_srgb,var(--muted)_40%,var(--border))]";
}

const stepperStyles = {
  circleSize: "h-8 w-8 text-sm",
  checkSize: "h-4 w-4",
  labelSize: "text-sm",
  innerLineWidth: "w-5",
  stepGap: "gap-2",
} as const;

function StepChip({
  step,
  state,
  styles,
}: {
  step: StepDef;
  state: StepState;
  styles: typeof stepperStyles;
}) {
  const { circleSize, checkSize, labelSize, stepGap } = styles;

  return (
    <div className={cn("flex shrink-0 items-center", stepGap)}>
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-full border-2 font-semibold tabular-nums transition-colors",
          circleSize,
          state === "current" &&
            "border-[var(--primary)] bg-[var(--primary)] text-[var(--on-primary)] shadow-sm",
          state === "complete" &&
            "border-[var(--primary)] bg-[color-mix(in_srgb,var(--primary)_12%,var(--card-bg))] text-[var(--primary)]",
          state === "upcoming" &&
            "border-[var(--border)] bg-[var(--surface-overlay)] text-[var(--muted-foreground)]",
        )}
      >
        {state === "complete" ? <Check className={checkSize} aria-hidden /> : step.number}
      </span>

      <span
        className={cn(
          "flex shrink-0 items-center gap-0.5 pr-2.5 @sm:gap-1 @sm:pr-3",
          labelSize,
          state === "current"
            ? "text-[var(--primary)]"
            : state === "complete"
              ? "text-[var(--foreground)]"
              : "text-[var(--muted-foreground)]",
        )}
      >
        <span className="whitespace-nowrap font-semibold text-base @sm:text-lg">{step.title}</span>
        <PhaseGuideHelpButton
          phase={step.key}
          className={cn("h-4 w-4 shrink-0", state === "upcoming" && "opacity-70")}
        />
      </span>
    </div>
  );
}

export function ActivityPhaseStepper({ currentPhase, className }: Props) {
  const currentIndex = TIMED_PHASE_ORDER.indexOf(currentPhase);
  const currentStep = PHASE_STEP_DEFS[currentIndex];

  return (
    <nav
      aria-label="활동 단계"
      className={cn("w-full py-1 @md:overflow-x-auto @md:pb-6 @md:py-1.5", className)}
    >
      <div className="@md:hidden" aria-current="step">
        <StepChip step={currentStep} state="current" styles={stepperStyles} />
      </div>

      <ol className="hidden min-w-0 w-full items-center @md:flex">
        {PHASE_STEP_DEFS.map((step, index) => {
          const state = stepStateAt(index, currentIndex);
          const isLast = index === PHASE_STEP_DEFS.length - 1;
          const connectorAfterActive = index < currentIndex;

          return (
            <li
              key={step.key}
              className={cn(
                "flex min-w-0 items-center",
                isLast ? "shrink-0" : "min-w-[5rem] flex-1",
              )}
              aria-current={state === "current" ? "step" : undefined}
            >
              <StepChip step={step} state={state} styles={stepperStyles} />
              {!isLast ? (
                <div
                  className={cn(
                    "h-0.5 min-w-3 flex-1 rounded-full",
                    connectorClass(connectorAfterActive),
                  )}
                  aria-hidden
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
