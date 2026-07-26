"use client";

import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";

import { activityLoaderRegionInset } from "@/lib/theme/activity-layout-chrome";
import { cn } from "@/lib/utils";

export type LoadingStateProps = {
  label?: ReactNode;
  variant?: "page" | "section" | "compact" | "inline";
  className?: string;
  spinnerClassName?: string;
};

const VARIANT_INNER = {
  page: "flex flex-col items-center justify-center gap-4",
  section: "flex flex-col items-center justify-center gap-3",
  compact: "flex flex-col items-center justify-center gap-2",
  inline: "inline-flex flex-row flex-wrap items-center justify-center gap-3",
} as const;

const VARIANT_SPINNER = {
  page: "h-10 w-10",
  section: "h-8 w-8",
  compact: "h-6 w-6",
  inline: "h-5 w-5 shrink-0",
} as const;

const VARIANT_LABEL = {
  page: "text-center text-sm",
  section: "text-center text-sm",
  compact: "text-center text-xs",
  inline: "text-sm",
} as const;

function outerClass(variant: NonNullable<LoadingStateProps["variant"]>, className?: string) {
  switch (variant) {
    case "page":
      return cn(
        activityLoaderRegionInset,
        "mx-auto w-full max-w-5xl min-h-dvh flex-1 px-4 py-8",
        className,
      );
    case "section":
      return cn(activityLoaderRegionInset, "w-full min-h-0 flex-1 px-4", className);
    case "compact":
      return cn(activityLoaderRegionInset, "w-full min-h-0 px-4 py-4", className);
    case "inline":
      return cn(
        "inline-flex w-full flex-row flex-wrap items-center justify-center gap-3 py-0",
        className,
      );
  }
}

export function LoadingState({
  label = "불러오는 중…",
  variant = "section",
  className,
  spinnerClassName,
}: LoadingStateProps) {
  const labelNode =
    label !== null ? (
      <p className={cn(VARIANT_LABEL[variant], "text-[var(--muted-foreground)]")}>{label}</p>
    ) : null;

  const spinner = (
    <Loader2
      className={cn(
        "animate-spin text-[var(--primary)]",
        VARIANT_SPINNER[variant],
        spinnerClassName,
      )}
      aria-hidden
    />
  );

  if (variant === "inline") {
    return (
      <div className={outerClass(variant, className)} role="status" aria-live="polite">
        {spinner}
        {labelNode}
      </div>
    );
  }

  return (
    <div className={outerClass(variant, className)} role="status" aria-live="polite">
      <div className={VARIANT_INNER[variant]}>
        {spinner}
        {labelNode}
      </div>
    </div>
  );
}
