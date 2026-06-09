"use client";

import type { ReactNode } from "react";

import { activityLayoutType } from "@/components/activity/activity-layout-typography";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  children?: ReactNode;
  contained?: boolean;
  className?: string;
};

/** 학생 play — 제출·단계 완료 상단 배너 */
export function PlayPhaseStatusBanner({ title, children, contained = false, className }: Props) {
  return (
    <div
      role="status"
      className={cn(
        "w-full border-b border-[color-mix(in_srgb,var(--primary)_28%,var(--border))]",
        "bg-[color-mix(in_srgb,var(--primary)_14%,var(--play-panel))]",
        "text-center shadow-[0_1px_0_color-mix(in_srgb,var(--primary)_10%,transparent)]",
        contained ? "px-3 py-2 @sm:py-2.5" : "px-4 py-2.5 @sm:px-5 @sm:py-3",
        className,
      )}
    >
      <p
        className={cn(
          "font-bold text-[var(--primary)]",
          contained ? activityLayoutType.playPanelChip : "text-sm @sm:text-base",
        )}
      >
        {title}
      </p>
      {children ? (
        <p
          className={cn(
            "mt-1 text-[var(--muted-foreground)]",
            contained ? activityLayoutType.caption : activityLayoutType.playPanelBody,
          )}
        >
          {children}
        </p>
      ) : null}
    </div>
  );
}
