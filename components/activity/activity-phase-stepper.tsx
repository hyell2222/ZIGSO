"use client";

import { Check } from "lucide-react";

import {
  PHASE_STEP_DEFS,
  TIMED_PHASE_ORDER,
  type TimedPhaseKey,
  getPhaseStepGuide,
} from "@/lib/activity-phases";
import { cn } from "@/lib/utils";

type Props = {
  currentPhase: TimedPhaseKey;
  className?: string;
};

type StepState = "complete" | "current" | "upcoming";

type StepDef = (typeof PHASE_STEP_DEFS)[number];

function stepStateAt(index: number, currentIndex: number): StepState {
  if (currentIndex === -1) return "upcoming";
  if (index < currentIndex) return "complete";
  if (index === currentIndex) return "current";
  return "upcoming";
}

function connectorClass(active: boolean) {
  return active
    ? "bg-[var(--primary)]"
    : "bg-[color-mix(in_srgb,var(--muted)_40%,var(--border))]";
}

function StepChip({
  step,
  state,
}: {
  step: StepDef;
  state: StepState;
}) {
  return (
    <div className="flex shrink-0 items-center gap-2 text-left animate-fade-in">
      <span
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-[0.8rem] font-semibold tabular-nums transition-colors",
          state === "current" &&
          "border-[var(--primary)] bg-[var(--primary)] text-[var(--on-primary)] shadow-sm",
          state === "complete" &&
          "border-[var(--primary)] bg-[color-mix(in_srgb,var(--primary)_12%,var(--card-bg))] text-[var(--primary)]",
          state === "upcoming" &&
          "border-[var(--border)] bg-[var(--surface-overlay)] text-[var(--muted-foreground)]",
        )}
      >
        {state === "complete" ? (
          <Check className="h-4 w-4" aria-hidden />
        ) : (
          step.number
        )}
      </span>

      <span
        className={cn(
          "inline-flex items-center gap-1 whitespace-nowrap font-semibold text-sm sm:text-base",
          state === "current"
            ? "text-[var(--primary)]"
            : state === "complete"
              ? "text-[var(--foreground)]"
              : "text-[var(--muted-foreground)]",
        )}
      >
        {step.title}
      </span>
    </div>
  );
}

export function ActivityPhaseStepper({ currentPhase, className }: Props) {
  const currentIndex = PHASE_STEP_DEFS.findIndex((s) => s.key === currentPhase);
  const currentStep = currentIndex !== -1 ? PHASE_STEP_DEFS[currentIndex] : PHASE_STEP_DEFS[0];
  const guide = getPhaseStepGuide(currentPhase);

  return (
    <nav
      aria-label="활동 단계"
      className={cn(
        "w-full border-b border-[var(--border)] bg-[var(--card-bg)] px-4 py-3 sm:px-2",
        className,
      )}
    >
      <div className="mx-auto max-w-5xl px-4 @md:hidden" aria-current="step">
        <StepChip step={currentStep} state="current" />
      </div>

      <ol className="mx-auto hidden max-w-5xl items-center justify-center gap-4 px-4 @md:flex">
        {PHASE_STEP_DEFS.map((step, index) => {
          const state = stepStateAt(index, currentIndex);
          const isLast = index === PHASE_STEP_DEFS.length - 1;
          const connectorAfterActive = index < currentIndex;

          return (
            <li
              key={step.key}
              className={cn(
                "flex items-center",
                isLast ? "shrink-0" : "flex-1 max-w-5xl",
              )}
              aria-current={state === "current" ? "step" : undefined}
            >
              <StepChip step={step} state={state} />

              {!isLast ? (
                <div
                  className={cn(
                    "ml-4 h-0.5 flex-1 rounded-full transition-colors",
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