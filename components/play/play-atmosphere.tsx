"use client";

import type { CSSProperties, ReactNode } from "react";

import {
  activityFooterChrome,
  activityLoaderRegion,
  activityMainContent,
  activityMainInner,
  activityPhaseHeaderInner,
  activityPhaseHeaderShell,
} from "@/components/activity/activity-layout-chrome";
import { cn } from "@/lib/utils";

type PlayAtmosphereProps = {
  children: ReactNode;
  className?: string;
  variant?: "viewport" | "contained";
};

/** 학생 play 본페이지 — 밝은 활동 화면 배경 */
export const PLAY_PAGE_BLACK_BG: CSSProperties = {
  backgroundColor: "var(--entry-shell-deep)",
  backgroundImage: `
    radial-gradient(ellipse 85% 55% at 50% -8%, color-mix(in srgb, #fff8ee 90%, transparent) 0%, transparent 55%),
    radial-gradient(ellipse 50% 40% at 8% 20%, color-mix(in srgb, #d8f0e8 70%, transparent) 0%, transparent 50%),
    radial-gradient(ellipse 45% 38% at 92% 24%, color-mix(in srgb, #ffe9cc 55%, transparent) 0%, transparent 48%),
    linear-gradient(180deg, var(--entry-shell) 0%, var(--entry-shell-deep) 55%, color-mix(in srgb, #f5efe4 88%, var(--entry-shell-deep)) 100%)
  `,
};

export const playSurfacePanel =
  "rounded-2xl border-2 border-[var(--play-border-cool)] bg-[var(--play-panel)] text-[var(--foreground)] shadow-[var(--play-shadow-soft)]";

export const playSurfaceWarm =
  "rounded-2xl border-2 border-[var(--play-border-warm)] bg-[var(--play-panel-warm)] text-[var(--foreground)] shadow-[var(--play-shadow-lift)]";

export const playSurfaceCool =
  "rounded-2xl border-2 border-[var(--play-border-cool)] bg-[var(--play-panel-cool)] text-[var(--foreground)] shadow-[var(--play-shadow-soft)]";

export const playSurfacePanelHeader =
  "border-b-2 border-[color-mix(in_srgb,var(--primary)_14%,var(--border))] bg-[color-mix(in_srgb,var(--primary)_6%,white)]";

export const playSurfaceWarmHeader =
  "border-b-2 border-[color-mix(in_srgb,var(--highlight)_25%,var(--border))] bg-[color-mix(in_srgb,var(--highlight)_10%,white)]";

/** @deprecated `activityPhaseHeaderShell` 사용 */
export const playPhaseHeaderChrome = activityPhaseHeaderShell;

/** @deprecated `activityPhaseHeaderShell` 사용 */
export const playPhaseHeaderChromeShell = cn("shrink-0", activityPhaseHeaderShell);

/** @deprecated `activityPhaseHeaderInner` 사용 */
export const playPhaseHeaderChromeInner = activityPhaseHeaderInner;

/** @deprecated `activityLoaderRegion` */
export const playLoaderRegion = activityLoaderRegion;

/** @deprecated `activityMainInner` */
export const playPhaseMainInner = activityMainInner;

/** @deprecated `activityMainContent` */
export const playPhaseMainContent = activityMainContent;

/** @deprecated `activityFooterChrome` */
export const playPhaseFooterChrome = activityFooterChrome;

export function PlayAtmosphere({
  children,
  className,
  variant = "viewport",
}: PlayAtmosphereProps) {
  const isContained = variant === "contained";
  return (
    <div
      className={cn(
        "@container play-shell relative isolate overflow-hidden font-sans",
        isContained ? "h-full min-h-0 w-full" : "h-dvh min-h-0 w-full",
        className,
      )}
      style={PLAY_PAGE_BLACK_BG}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage: `
            linear-gradient(90deg, color-mix(in srgb, var(--primary) 5%, transparent) 50%, transparent 50%),
            linear-gradient(color-mix(in srgb, var(--primary) 4%, transparent) 50%, transparent 50%)
          `,
          backgroundSize: "2.25rem 2.25rem",
          maskImage: "linear-gradient(180deg, transparent 0%, black 40%, black 100%)",
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-8 top-[12%] h-24 w-24 rounded-full bg-[color-mix(in_srgb,#ffe8c8_55%,transparent)] blur-2xl motion-safe:animate-[playFloat_5s_ease-in-out_infinite]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-6 top-[20%] h-20 w-20 rounded-full bg-[color-mix(in_srgb,#c8ebe0_60%,transparent)] blur-2xl motion-safe:animate-[playFloat_6s_ease-in-out_infinite_0.6s]"
        aria-hidden
      />
      <div
        className="relative z-10 flex h-full min-h-0 flex-col overflow-hidden"
      >
        {children}
      </div>
    </div>
  );
}
