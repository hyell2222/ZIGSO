"use client";

import type { ReactNode } from "react";

import { activityLayoutType } from "@/lib/theme/activity-layout-typography";
import { cn } from "@/lib/utils";

const t = activityLayoutType;

export function ScoreTile({
  label,
  value,
  highlight,
  labelExtra,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  labelExtra?: ReactNode;
}) {
  const highlightClass =
    "border-[color-mix(in_srgb,var(--primary)_38%,var(--border))] bg-[color-mix(in_srgb,var(--primary)_8%,var(--card-bg))]";
  const defaultClass = "border-[var(--border)] bg-[var(--card-bg)]";

  return (
    <div
      className={cn(
        "flex w-full items-center justify-between gap-2 sm:gap-3 rounded-lg border px-3 sm:px-4 py-2.5 min-w-0 overflow-hidden",
        highlight ? highlightClass : defaultClass,
      )}
    >
      <div className="flex min-w-0 items-center gap-1">
        <p className={cn("text-xs font-light text-[var(--muted-foreground)] truncate", t.caption)}>
          {label}
        </p>
        {labelExtra}
      </div>
      <p
        className={cn(
          "shrink-0 tabular-nums text-sm sm:text-base font-bold whitespace-nowrap ml-2",
          highlight ? "text-[var(--primary)]" : "text-[var(--foreground)]",
        )}
      >
        {value}
      </p>
    </div>
  );
}
