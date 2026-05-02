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

/**
 * Play 단계 헤더(PlayPhaseHeader 래퍼) — 전 폭 스트립(비카드), 밝은 페이퍼·서피스 크롬.
 * 본문 `main`과 구분되는 얕은 하단 보더·미스트 섀도만 사용.
 */
export const playPhaseHeaderChrome =
  "border-b border-[color-mix(in_srgb,var(--primary)_18%,var(--border))] bg-[color-mix(in_srgb,var(--surface)_28%,var(--background)_72%)] text-[var(--foreground)] shadow-[0_1px_0_color-mix(in_srgb,var(--primary)_8%,transparent),0_12px_32px_-10px_color-mix(in_srgb,var(--ink)_5%,transparent)]";

/** 단계 헤더 스트립 바깥 — 크롬 + 등장 애니메이션 (패딩은 inner 전용) */
export const playPhaseHeaderChromeShell = cn(
  "shrink-0",
  playPhaseHeaderChrome,
  "motion-safe:animate-[playRevealUp_0.55s_cubic-bezier(0.22,1,0.36,1)_both]",
);

/**
 * 단계 헤더 안쪽 — 본문 `main`과 동일한 max-width·좌우 패딩·세로 간격.
 * (3단계 본문이 `max-w-2xl`이어도 헤더 밴드는 1·2단계와 같은 룰로 맞춤.)
 */
export const playPhaseHeaderChromeInner =
  "mx-auto w-full max-w-6xl px-4 py-4 text-left sm:px-6";

/**
 * 로딩·대기 — 카드 없이 뷰포트 안에서 가로·세로 중앙.
 * 부모는 `flex min-h-dvh flex-col` 등으로 높이를 넘겨 주면 `flex-1`로 남는 영역을 채움.
 */
export const playLoaderRegion =
  "flex w-full min-h-0 flex-1 flex-col items-center justify-center px-4 py-10";

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
