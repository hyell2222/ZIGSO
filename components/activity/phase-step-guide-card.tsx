"use client";

import type { ReactNode } from "react";

import { ActivityPhaseStepper } from "@/components/activity/activity-phase-stepper";
import { activityLayoutType } from "@/components/activity/activity-layout-typography";
import { getPhaseStepDef, TEACHER_PHASE_GUIDES, type TimedPhaseKey } from "@/lib/activity-phases";
import { cn } from "@/lib/utils";

type Surface = "band" | "card";

type Props = {
  phase: TimedPhaseKey;
  contained?: boolean;
  audience?: "play" | "teacher";
  /** band: 구분선만 (겹침 없음) · card: 독립 카드 */
  surface?: Surface;
  rightSlot?: ReactNode;
  headerExtra?: ReactNode;
  className?: string;
  children?: ReactNode;
};

/** 1~4단계 — stepper + 안내 (단일 크롬 레이어) */
export function PhaseStepGuideCard({
  phase,
  contained = false,
  audience = "play",
  surface = "band",
  rightSlot,
  headerExtra,
  className,
  children,
}: Props) {
  const step = getPhaseStepDef(phase);
  const isTeacher = audience === "teacher";
  const summary = isTeacher ? TEACHER_PHASE_GUIDES[phase].summary : step.summary;
  const trailing = headerExtra ?? rightSlot;

  return (
    <section
      aria-labelledby={`phase-guide-${step.key}`}
      className={cn(
        surface === "card"
          ? "overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card-bg)] shadow-[var(--elevation-sm)]"
          : isTeacher
            ? ""
            : "border-b border-[color-mix(in_srgb,var(--primary)_14%,var(--border))] bg-[color-mix(in_srgb,var(--tint-primary-weak)_35%,var(--surface))]",
        className,
      )}
    >
      <div
        className={cn(
          surface === "card" ? "px-4 py-4 @md:px-5 @md:py-4" : isTeacher ? "" : "pb-4 @md:pb-5",
        )}
      >
        <h2
          id={`phase-guide-${step.key}`}
          className={cn(
            "sr-only",
            contained ? activityLayoutType.phaseTitle : activityLayoutType.phaseTitleExpanded,
          )}
        >
          {step.number}단계 · {step.title}
        </h2>

        {isTeacher ? (
          <>
            <ActivityPhaseStepper
              currentPhase={phase}
              contained={contained}
              variant="teacher"
              className="min-w-0 w-full"
            />
            <p
              className={cn(
                "mx-auto mt-3 max-w-3xl text-center",
                contained ? activityLayoutType.phaseDescription : activityLayoutType.phaseDescriptionExpanded,
                "text-[color-mix(in_srgb,var(--foreground)_88%,var(--muted-foreground))]",
              )}
            >
              {summary}
            </p>
          </>
        ) : (
          <>
            <ActivityPhaseStepper currentPhase={phase} contained={contained} className="w-full" />
            <div className="mt-4 flex flex-col gap-3 @md:flex-row @md:items-start @md:justify-between @md:gap-6">
              <p
                className={cn(
                  "max-w-2xl",
                  contained ? activityLayoutType.phaseDescription : activityLayoutType.playPanelBody,
                )}
              >
                <span className="font-semibold text-[var(--foreground)]">{step.title}</span>
                <span className="text-[var(--muted-foreground)]"> — {summary}</span>
              </p>
              {trailing ? (
                <div className="flex w-full shrink-0 justify-start @md:w-auto @md:justify-end">
                  {trailing}
                </div>
              ) : null}
            </div>
          </>
        )}

        {children ? (
          <div className="mt-4 border-t border-[var(--border)] pt-4">{children}</div>
        ) : null}
      </div>
    </section>
  );
}
