"use client";

import type { ReactNode } from "react";

import { activityLayoutType } from "@/components/activity/activity-layout-typography";
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
        "flex w-full items-center justify-between gap-3 rounded-lg border px-4 py-2.5",
        highlight ? highlightClass : defaultClass,
      )}
    >
      <div className="flex min-w-0 items-center gap-0.5">
        <p className={cn("text-xs font-light text-[var(--muted-foreground)]", t.caption)}>
          {label}
        </p>
        {labelExtra}
      </div>
      <p
        className={cn(
          "shrink-0 tabular-nums text-base font-bold",
          highlight ? "text-[var(--primary)]" : "text-[var(--foreground)]",
        )}
      >
        {value}
      </p>
    </div>
  );
}
