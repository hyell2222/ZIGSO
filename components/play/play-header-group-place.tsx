"use client";

import { groupNumberDisplay } from "@/lib/activity-pack/engine";
import { LOADING_COPY } from "@/lib/activity-phases";
import { LoadingState } from "@/components/ui/loading-state";
import { cn } from "@/lib/utils";

/** 학생 play — 모둠·역할 배지 */
export function PlayHeaderGroupPlace({
  groupName,
  placeName,
  placeLabel = "역할",
  pending,
  className,
}: {
  groupName: string | null;
  placeName: string | null;
  placeLabel?: string;
  pending?: boolean;
  className?: string;
}) {
  const group = groupNumberDisplay(groupName);
  const place = placeName?.trim() || "—";

  const labelClass =
    "text-[0.75rem] font-semibold uppercase tracking-[0.125em] text-[var(--muted-foreground)] @sm:text-[1rem]";

  const valueClass =
    "truncate font-mono font-bold tabular-nums leading-none text-[var(--primary)] text-[0.75rem] @sm:text-[1rem]";

  return (
    <div
      className={cn(
        "inline-flex w-fit min-w-0 max-w-full shrink-0 flex-row items-stretch",
        "rounded-xl border border-[color-mix(in_srgb,var(--play-border-cool)_60%,var(--border))]",
        "bg-[color-mix(in_srgb,var(--play-panel)_96%,transparent)]",
        "px-3.5 py-2 @sm:px-4 @sm:py-2.5",
        className,
      )}
    >
      {pending ? (
        <LoadingState
          variant="inline"
          label={LOADING_COPY.default}
          className="w-auto gap-1.5 py-0"
        />
      ) : (
        <>
          <div className="flex min-w-0 flex-row items-center gap-2">
            <p className={labelClass}>모둠 ·</p>
            <p className={valueClass}>{group}</p>
          </div>
          <div className="mx-2 w-px shrink-0 self-stretch bg-[var(--border)] @sm:mx-2.5" aria-hidden />
          <div className="flex min-w-0 flex-row items-center gap-2">
            <p className={labelClass}>{placeLabel} ·</p>
            <p className={valueClass}>{place}</p>
          </div>
        </>
      )}
    </div>
  );
}
