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
  return (
    <div
      className={cn(
        "rounded-xl border px-3 py-3 text-center",
        highlight
          ? "border-[color-mix(in_srgb,var(--primary)_38%,var(--border))] bg-[color-mix(in_srgb,var(--primary)_8%,var(--card-bg))]"
          : "border-[var(--border)] bg-[var(--card-bg)]",
      )}
    >
      <div className="flex items-center justify-center">
        <span className="relative inline-block">
          <p className={cn("text-xs font-light text-[var(--muted-foreground)]", t.caption)}>{label}</p>
          {labelExtra ? (
            <span className="absolute left-full top-1/2 ml-1 -translate-y-1/2">{labelExtra}</span>
          ) : null}
        </span>
      </div>
      <p
        className={cn(
          "mt-1 tabular-nums",
          highlight
            ? "text-xl font-extrabold text-[var(--primary)]"
            : "text-lg font-bold text-[var(--foreground)]",
        )}
      >
        {value}
      </p>
    </div>
  );
}
