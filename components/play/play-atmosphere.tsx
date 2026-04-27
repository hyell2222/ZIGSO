"use client";

import type { CSSProperties, ReactNode } from "react";

import { cn } from "@/lib/utils";

type PlayAtmosphereProps = {
  children: ReactNode;
  className?: string;
  /** 상단 광원 강도 (기본: 입장 랜딩과 유사) */
  variant?: "default" | "dense";
};

/** 입장 랜딩(`StudentBlackoutLanding`)과 동일 계열: 짙은 셸 + 격자 + 은광, 베이지 본문 배경 없음 */
const PLAY_ENTRY_BG: CSSProperties = {
  backgroundColor: "var(--entry-shell-deep)",
  backgroundImage: `
    linear-gradient(180deg, color-mix(in srgb, var(--entry-shell) 96%, transparent) 0%, var(--entry-shell-deep) 100%),
    repeating-linear-gradient(0deg, transparent, transparent 1px, var(--entry-grid) 1px, var(--entry-grid) 2px),
    repeating-linear-gradient(90deg, transparent, transparent 1px, var(--entry-grid) 1px, var(--entry-grid) 2px)
  `,
};

/**
 * 학생 `/play` 본편(브리핑·최종보고·로비) 공통: 랜딩과 맞는 어두운 셸 + 콘텐츠.
 */
export function PlayAtmosphere({ children, className, variant = "default" }: PlayAtmosphereProps) {
  const topGlow =
    variant === "dense"
      ? "color-mix(in srgb, var(--primary) 20%, transparent)"
      : "color-mix(in srgb, var(--primary) 12%, transparent)";

  return (
    <div
      className={cn("relative isolate min-h-dvh font-sans", className)}
      style={PLAY_ENTRY_BG}
    >
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[color-mix(in_srgb,var(--primary)_12%,transparent)] to-transparent"
        aria-hidden
      />
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
        <div
          className="absolute inset-0 motion-safe:animate-[playAmbientPulse_11s_ease-in-out_infinite] motion-reduce:animate-none"
          style={{
            background: `radial-gradient(ellipse 85% 45% at 50% 0%, ${topGlow}, transparent 58%)`,
          }}
        />
        <div
          className="absolute inset-0 mix-blend-multiply"
          style={{
            background:
              "radial-gradient(ellipse 95% 90% at 50% 55%, transparent 12%, color-mix(in srgb, var(--ink) 18%, transparent) 100%)",
          }}
        />
        <div className="play-film-grain absolute inset-0" />
        <div
          className="absolute inset-0 motion-safe:animate-[playScanlineDrift_10s_ease-in-out_infinite] motion-reduce:animate-none opacity-[0.12] motion-reduce:opacity-0"
          style={{
            background: `repeating-linear-gradient(
              0deg,
              transparent,
              transparent 2px,
              color-mix(in srgb, var(--primary) 6%, transparent) 2px,
              transparent 4px
            )`,
            maskImage: "radial-gradient(ellipse 100% 80% at 50% 50%, black 0%, transparent 88%)",
          }}
        />
      </div>
      <div className="relative z-10 min-h-dvh text-[color:var(--entry-parchment)] [&_input]:text-[color:var(--entry-parchment)] [&_input]:placeholder:text-[color:var(--entry-parchment-muted)] [&_textarea]:text-[color:var(--entry-parchment)] [&_textarea]:placeholder:text-[color:var(--entry-parchment-muted)] [&_select]:bg-[color-mix(in_srgb,var(--mystery)_70%,var(--ink))] [&_select]:text-[color:var(--entry-parchment)]">
        {children}
      </div>
    </div>
  );
}
