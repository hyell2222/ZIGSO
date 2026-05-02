"use client";

import { Loader2 } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";

import { cn } from "@/lib/utils";

export type LoadingStateProps = {
  label?: ReactNode;
  variant?: "page" | "section" | "compact" | "inline";
  tone?: "default" | "play" | "onPrimary";
  className?: string;
  spinnerClassName?: string;
};

const VARIANT_WRAPPER = {
  page: "flex w-full flex-col items-center justify-center gap-4 px-4 py-16 min-h-[50vh]",
  section: "flex w-full flex-col items-center justify-center gap-3 py-10 min-h-[12rem]",
  compact: "flex w-full flex-col items-center justify-center gap-2 py-8 min-h-[8rem]",
  inline: "inline-flex w-full flex-row flex-wrap items-center justify-center gap-3 py-6",
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

export function LoadingState({
  label = "불러오는 중…",
  variant = "section",
  tone = "default",
  className,
  spinnerClassName,
}: LoadingStateProps) {
  const isPlay = tone === "play";
  const isOnPrimary = tone === "onPrimary";

  const labelTone = isPlay
    ? "tracking-wide text-[color:var(--entry-parchment-muted)]"
    : isOnPrimary
      ? "font-medium text-[var(--on-primary)]/90"
      : "text-[var(--muted-foreground)]";

  const spinnerStyle: CSSProperties | undefined = isPlay
    ? {
        filter: "drop-shadow(0 0 10px color-mix(in srgb, var(--primary) 38%, transparent))",
      }
    : undefined;

  const spinnerColor = isOnPrimary ? "text-[var(--on-primary)]" : "text-[var(--primary)]";

  return (
    <div className={cn(VARIANT_WRAPPER[variant], className)} role="status" aria-live="polite">
      <Loader2
        className={cn("animate-spin", spinnerColor, VARIANT_SPINNER[variant], spinnerClassName)}
        style={spinnerStyle}
        aria-hidden
      />
      {label !== null ? <p className={cn(VARIANT_LABEL[variant], labelTone)}>{label}</p> : null}
    </div>
  );
}
