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
    <nav className="w-full py-4">
      <ol className="flex w-full min-w-0 items-center">
        {EDITOR_STEPS.map((step, index) => {
          const isActive = step.id === currentStep;
          const isReachable = index <= maxReachableIndex;

          return (
            <Fragment key={step.id}>
              {index > 0 ? (
                <li
                  className="mx-2 flex min-w-0 flex-[999_999_0] list-none items-center sm:mx-4"
                  aria-hidden
                >
                  <span className="h-px w-full min-w-0 rounded-full bg-[var(--border)]" />
                </li>
              ) : null}

              <li className="flex min-w-0 flex-[0_1_auto] list-none justify-center">
                <Button
                  type="button"
                  variant="ghost"
                  disabled={!isReachable}
                  onClick={() => isReachable && onStepChange(step.id)}
                  className="min-w-0 max-w-full gap-1.5 rounded-full bg-transparent px-0 py-1.5 shadow-none hover:bg-transparent sm:gap-2"
                >
                  <span
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold transition-colors",
                      isActive
                        ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--on-primary)]"
                        : "border-[var(--border)] text-[var(--muted-foreground)]",
                    )}
                  >
                    {index + 1}
                  </span>

                  <span
                    className={cn(
                      "hidden min-w-0 flex-1 truncate text-base font-semibold transition-colors sm:inline",
                      isActive ? "text-[var(--primary)]" : "text-[var(--foreground)]",
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
        <>
          <p className="mt-3 text-center text-base font-semibold text-[var(--primary)] sm:hidden">
            {activeStep.title}
          </p>
          <p className="mt-1 text-center text-xs leading-relaxed text-[var(--muted-foreground)] sm:mt-2 sm:text-left sm:text-sm">
            {activeStep.description}
          </p>
        </>
      ) : null}
    </nav>
  );
}
