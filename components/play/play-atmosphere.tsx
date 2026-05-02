"use client";

import type { CSSProperties, ReactNode } from "react";

import { cn } from "@/lib/utils";

type PlayAtmosphereProps = {
  children: ReactNode;
  className?: string;
};

/** 학생 play 본페이지 바깥 레이어 — 짙은 그라데이션 배경 */
export const PLAY_PAGE_BLACK_BG: CSSProperties = {
  backgroundColor: "var(--entry-shell-deep)",
  backgroundImage: `
    radial-gradient(ellipse 100% 70% at 50% -10%, color-mix(in srgb, var(--primary) 7%, transparent), transparent 50%),
    linear-gradient(180deg, color-mix(in srgb, var(--ink) 55%, var(--entry-shell-deep)) 0%, var(--entry-shell-deep) 40%, var(--entry-shell-deep) 100%)
  `,
};

/** 기본 패널 — 중립 베이지 */
export const playSurfacePanel =
  "rounded-xl border border-[var(--play-border-cool)] bg-[var(--play-panel)] text-[var(--foreground)] shadow-[var(--play-shadow-soft)]";

/** 강조 패널 — 앰버 톤 (대기·브리핑 헤더·배지 류) */
export const playSurfaceWarm =
  "rounded-xl border border-[var(--play-border-warm)] bg-[var(--play-panel-warm)] text-[var(--foreground)] shadow-[var(--play-shadow-lift)]";

/** 차분 패널 — 프라이머리 미스트 (보조·폼 컨테이너) */
export const playSurfaceCool =
  "rounded-xl border border-[var(--play-border-cool)] bg-[var(--play-panel-cool)] text-[var(--foreground)] shadow-[var(--play-shadow-soft)]";

export const playSurfacePanelHeader =
  "border-b border-[var(--border)] bg-[var(--tint-accent-weak)]";

export const playSurfaceWarmHeader =
  "border-b border-[var(--border)] bg-[var(--panel-warn-bg)]";

export function PlayAtmosphere({ children, className }: PlayAtmosphereProps) {
  return (
    <div
      className={cn("play-shell relative isolate min-h-dvh font-sans", className)}
      style={PLAY_PAGE_BLACK_BG}
    >
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[color-mix(in_srgb,black_25%,transparent)] to-transparent"
        aria-hidden
      />
      <div className="relative z-10 min-h-dvh">{children}</div>
    </div>
  );
}
