"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type PlayAtmosphereProps = {
  children: ReactNode;
  className?: string;
};

export const playSurfaceCool =
  "rounded-2xl border-2 border-[var(--play-border-cool)] bg-[var(--play-panel-cool)] text-[var(--foreground)] shadow-[var(--play-shadow-soft)]";

export function PlayAtmosphere({ children, className }: PlayAtmosphereProps) {
  return (
    <div
      className={cn(
        "@container play-shell relative isolate overflow-hidden font-sans",
        "flex h-full min-h-0 w-full flex-1 flex-col",
        className,
      )}
    >
      <div
        className="pointer-events-none absolute -left-8 top-[12%] z-[1] h-24 w-24 rounded-full bg-[color-mix(in_srgb,#ffe8c8_55%,transparent)] blur-2xl motion-safe:animate-[playFloat_5s_ease-in-out_infinite]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-6 top-[20%] z-[1] h-20 w-20 rounded-full bg-[color-mix(in_srgb,#c8ebe0_60%,transparent)] blur-2xl motion-safe:animate-[playFloat_6s_ease-in-out_infinite_0.6s]"
        aria-hidden
      />
      <div className="relative z-10 flex h-full min-h-0 flex-1 flex-col overflow-hidden">
        {children}
      </div>
    </div>
  );
}
