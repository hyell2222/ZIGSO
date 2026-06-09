"use client";

import { Loader2 } from "lucide-react";

import { activityLayoutType } from "@/components/activity/activity-layout-typography";
import {
  PlayPhaseWaitFootnote,
  PlayStudentTopBanner,
} from "@/components/play/play-phase-layout";
import { PlayPhaseShell } from "@/components/play/play-phase-shell";
import { cn } from "@/lib/utils";

const t = activityLayoutType;

const labelClass =
  "text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted-foreground)]";

function assignmentValueClass(contained: boolean) {
  return cn(
    "font-mono font-extrabold tabular-nums leading-none text-[var(--primary)]",
    contained ? "text-3xl @sm:text-4xl" : "text-4xl @sm:text-5xl",
  );
}

type Props = {
  groupName: string | null;
  roleLabel: string | null;
  pending?: boolean;
  contained?: boolean;
};

export function OverviewPhasePanel({
  groupName,
  roleLabel,
  pending,
  contained = false,
}: Props) {
  const group = groupName?.trim() || "—";
  const role = roleLabel?.trim() || "—";

  return (
    <PlayPhaseShell
      contained={contained}
      mainClassName="flex flex-1 flex-col"
      topBanner={
        <PlayStudentTopBanner
          phase="overview"
          groupName={groupName}
          placeName={roleLabel}
          placeLabel="역할"
          pending={pending}
          contained={contained}
        />
      }
    >
      <div
        className={cn(
          "flex flex-1 flex-col items-center justify-center px-4 py-6 text-center @sm:px-6 @sm:py-10",
          contained ? "min-h-[min(14rem,38dvh)]" : "min-h-[min(20rem,52dvh)]",
        )}
      >
        {pending ? (
          <div
            className={cn(
              "flex flex-col items-center gap-3 text-[var(--muted-foreground)]",
              contained ? "text-sm" : "text-base",
            )}
          >
            <Loader2
              className={cn(
                "animate-spin text-[var(--primary)]",
                contained ? "h-8 w-8" : "h-10 w-10 @sm:h-12 @sm:w-12",
              )}
              aria-hidden
            />
            <p className={t.playPanelBody}>모둠과 역할을 배정하는 중이에요…</p>
          </div>
        ) : (
          <div className="w-full max-w-xs space-y-3.5 @sm:max-w-sm @sm:space-y-4">
            <div
              className={cn(
                "rounded-xl border border-[color-mix(in_srgb,var(--primary)_32%,var(--border))]",
                "bg-[color-mix(in_srgb,var(--play-panel)_94%,var(--surface))]",
                "shadow-[var(--play-shadow-soft)]",
                "motion-safe:animate-[playRevealUp_0.48s_cubic-bezier(0.22,1,0.36,1)_both]",
                contained ? "px-4 py-4" : "px-5 py-5 @sm:px-6 @sm:py-5",
              )}
            >
              <div className="grid grid-cols-2 divide-x divide-[var(--border)]">
                <div className="flex flex-col items-center justify-center gap-1.5 px-3 py-1 @sm:px-4">
                  <p className={labelClass}>모둠</p>
                  <p className={assignmentValueClass(contained)}>{group}</p>
                </div>
                <div className="flex flex-col items-center justify-center gap-1.5 px-3 py-1 @sm:px-4">
                  <p className={labelClass}>역할</p>
                  <p className={assignmentValueClass(contained)}>{role}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <PlayPhaseWaitFootnote className="shrink-0" />
    </PlayPhaseShell>
  );
}
