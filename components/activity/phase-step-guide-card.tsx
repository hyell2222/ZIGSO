"use client";

import type { ReactNode } from "react";

import { ActivityPhaseStepper } from "@/components/activity/activity-phase-stepper";
import { getPhaseStepDef, type TimedPhaseKey } from "@/lib/activity-phases";
import { cn } from "@/lib/utils";

type Surface = "band" | "card";

type Props = {
  phase: TimedPhaseKey;
  /** band: 구분선만 (겹침 없음) · card: 독립 카드 */
  surface?: Surface;
  className?: string;
  children?: ReactNode;
};

/** 교사 호스트 — stepper + 단계 안내 */
export function PhaseStepGuideCard({
  phase,
  surface = "band",
  className,
  children,
}: Props) {
  const step = getPhaseStepDef(phase);

  return (
    <section
      aria-labelledby={`phase-guide-${step.key}`}
      className={cn(
        surface === "card" &&
          "overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card-bg)] shadow-[var(--elevation-sm)]",
        className,
      )}
    >
      <div className={cn(surface === "card" && "px-4 py-4 @md:px-5 @md:py-4")}>
        <ActivityPhaseStepper currentPhase={phase} className="min-w-0 w-full" />
        {children ? (
          <div className="mt-4 border-t border-[var(--border)] pt-4">{children}</div>
        ) : null}
      </div>
    </section>
  );
}
