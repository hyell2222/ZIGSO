"use client";

import type { CSSProperties, ReactNode } from "react";

import { cn } from "@/lib/utils";

type PlayAtmosphereProps = {
  children: ReactNode;
  className?: string;
  variant?: "viewport" | "contained";
};

/** 학생 play 본페이지 — 밝은 급식실 하늘 + 바닥 타일 */
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

export const playPhaseHeaderChrome =
  "border-b-2 border-[color-mix(in_srgb,var(--primary)_16%,var(--border))] bg-[color-mix(in_srgb,white_72%,var(--entry-shell))] text-[var(--foreground)] shadow-[0_4px_0_color-mix(in_srgb,var(--primary)_8%,transparent),0_12px_28px_-8px_color-mix(in_srgb,var(--primary)_12%,transparent)]";

export const playPhaseHeaderChromeShell = cn(
  "shrink-0",
  playPhaseHeaderChrome,
  "motion-safe:animate-[playRevealUp_0.55s_cubic-bezier(0.22,1,0.36,1)_both]",
);

export const playPhaseHeaderChromeInner =
  "mx-auto w-full max-w-6xl px-4 py-2.5 text-left sm:px-6 sm:py-3 md:px-8 md:py-4";

export const playLoaderRegion =
  "flex w-full min-h-0 flex-1 flex-col items-center justify-center px-4 py-10";

export function PlayAtmosphere({
  children,
  className,
  variant = "viewport",
}: PlayAtmosphereProps) {
  const isContained = variant === "contained";
  return (
    <div
      className={cn(
        "play-shell relative isolate overflow-hidden font-sans",
        isContained ? "h-full min-h-0 w-full" : "min-h-dvh",
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
        className={cn(
          "relative z-10",
          isContained
            ? "flex h-full min-h-0 flex-col overflow-y-auto"
            : "min-h-dvh pb-[env(safe-area-inset-bottom,0px)]",
        )}
      >
        {children}
      </div>
    </div>
  );
}
