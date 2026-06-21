"use client";

import { activityOverviewAssignmentCard } from "@/components/activity/activity-layout-chrome";
import { PlayPhaseShell } from "@/components/play/play-phase-shell";
import { LoadingState } from "@/components/ui/loading-state";
import { groupNumberDisplay } from "@/lib/activity-pack/engine";
import { LOADING_COPY } from "@/lib/activity-phases";
import { cn } from "@/lib/utils";

const overviewLabelClass =
  "text-sm @sm:text-base font-semibold uppercase tracking-[0.14em] text-[var(--muted-foreground)]";

const assignmentValueClass =
  "text-4xl @sm:text-5xl font-mono font-extrabold tabular-nums leading-none text-[var(--primary)]";

type Props = {
  groupName: string | null;
  roleLabel: string | null;
  pending?: boolean;
};

export function OverviewPhasePanel({ groupName, roleLabel, pending }: Props) {
  const group = groupNumberDisplay(groupName);
  const role = roleLabel?.trim() || "—";

  return (
    <PlayPhaseShell mainClassName="flex min-h-0 flex-1 flex-col pt-12 @sm:pt-20 @md:pt-24">
      {pending ? (
        <LoadingState
          variant="section"
          label={LOADING_COPY.assigningRoles}
          className="min-h-0 flex-1"
        />
      ) : (
        <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-start text-center">
          <div className={activityOverviewAssignmentCard}>
            <div
              className={cn(
                "border-b border-[color-mix(in_srgb,var(--primary)_22%,var(--border))]",
                "bg-[color-mix(in_srgb,var(--primary)_8%,transparent)]",
                "px-4 py-2.5 @sm:px-5",
              )}
            >
              <p className="text-sm font-bold text-[var(--foreground)] @sm:text-base">나의 배정</p>
            </div>
            <div className="grid grid-cols-2 divide-x divide-[color-mix(in_srgb,var(--primary)_18%,var(--border))]">
              <div className="flex flex-col items-center justify-center gap-2 px-4 py-5 @sm:px-5 @sm:py-6">
                <p className={overviewLabelClass}>모둠</p>
                <p className={assignmentValueClass}>{group}</p>
              </div>
              <div className="flex flex-col items-center justify-center gap-2 px-4 py-5 @sm:px-5 @sm:py-6">
                <p className={overviewLabelClass}>역할</p>
                <p className={cn(assignmentValueClass, "text-balance break-keep")}>{role}</p>
              </div>
            </div>
          </div>

          <div className="mt-8 max-w-md mx-auto px-4 text-center animate-fade-in">
            <p className="mt-2 text-xs sm:text-sm text-[var(--muted-foreground)] leading-relaxed font-medium">
              본인의 모둠과 역할을 확인한 후,<br className="hidden sm:inline" />
              배정된 모둠 자리로 이동하여 모둠원들과 함께 앉아주세요.
            </p>
          </div>
        </div>
      )}
    </PlayPhaseShell>
  );
}
