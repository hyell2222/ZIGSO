"use client";

import { Fragment } from "react";

import { cn } from "@/lib/utils";
import {
  EDITOR_STEPS,
  type EditorStepId,
} from "@/lib/activity-pack/activity-draft";
import { Button } from "../ui/button";

type Props = {
  currentStep: EditorStepId;
  onStepChange: (step: EditorStepId) => void;
  maxReachableIndex: number;
};

export function ActivityEditorStepper({
  currentStep,
  onStepChange,
  maxReachableIndex,
}: Props) {
  const activeStep = EDITOR_STEPS.find((s) => s.id === currentStep);

  return (
    <nav className="w-full py-3.5 bg-[var(--background)]">
      <ol className="flex w-full min-w-0 items-center justify-start overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {EDITOR_STEPS.map((step, index) => {
          const isActive = step.id === currentStep;
          const isReachable = index <= maxReachableIndex;

          return (
            <Fragment key={step.id}>
              {index > 0 ? (
                <li
                  className="mx-2.5 flex h-[2px] w-6 shrink-0 rounded-full bg-[var(--border)] sm:mx-3.5 sm:w-10"
                  aria-hidden
                />
              ) : null}

              <li className="flex shrink-0 items-center justify-center">
                <Button
                  type="button"
                  variant="ghost"
                  disabled={!isReachable}
                  onClick={() => isReachable && onStepChange(step.id)}
                  className={cn(
                    "min-w-0 max-w-full gap-2.5 rounded-full bg-transparent px-1.5 py-2 shadow-none transition-all",
                    "hover:bg-[color-mix(in_srgb,var(--accent)_6%,transparent)] focus-visible:ring-2",
                    !isReachable && "opacity-50"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-bold transition-all",
                      isActive
                        ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                        : "border-[var(--border)] bg-[var(--card-bg)] text-[var(--muted-foreground)]",
                    )}
                  >
                    {index + 1}
                  </span>

                  <span
                    className={cn(
                      "hidden min-w-0 truncate text-base font-semibold transition-colors sm:inline",
                      isActive 
                        ? "text-[var(--primary)] font-bold" 
                        : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]",
                    )}
                  >
                    {step.title}
                  </span>
                </Button>
              </li>
            </Fragment>
          );
        })}
      </ol>
      
      {activeStep ? (
        <p className="mt-2.5 text-center text-base font-bold text-[var(--primary)] sm:hidden animate-fadeIn">
          {activeStep.title}
        </p>
      ) : null}
    </nav>
  );
}