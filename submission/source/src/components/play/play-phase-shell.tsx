"use client";

import type { ReactNode } from "react";

import {
  activityFooterChrome,
  activityFooterInner,
  activityLayoutClasses,
  activityScrollBodyShell,
} from "@/components/activity/activity-layout-chrome";
import { PlayAtmosphere } from "@/components/play/play-atmosphere";
import { Z } from "@/lib/ui/z-index";
import { cn } from "@/lib/utils";

type PlayPhaseShellProps = {
  /** 상단 배너 — 단계·모둠·역할·완료 안내 */
  topBanner?: ReactNode;
  footer?: ReactNode;
  footerClue?: ReactNode;
  mainClassName?: string;
  /** 패널 전체(배너 포함)를 덮는 오버레이 — 샌드박스 contained 모달 */
  overlay?: ReactNode;
  children: ReactNode;
};

/** 학생 play·샌드박스 — 배너 고정, full-bleed 스크롤, 푸터 고정 */
export function PlayPhaseShell({
  topBanner,
  footer,
  footerClue,
  mainClassName,
  overlay,
  children,
}: PlayPhaseShellProps) {
  const layout = activityLayoutClasses();

  return (
    <PlayAtmosphere className="relative min-h-0 flex-1">
      {overlay}
      {topBanner ? (
        <div className={cn(Z.playBanner, "w-full shrink-0")}>{topBanner}</div>
      ) : null}

      <div className={activityScrollBodyShell}>
        <div
          className={cn(
            layout.pageBody,
            "flex flex-col pt-4 @sm:pt-6",
            mainClassName,
          )}
        >
          {children}
          <div className="h-4 shrink-0 @sm:h-6" aria-hidden />
        </div>
      </div>

      {footer || footerClue ? (
        <footer className={activityFooterChrome}>
          <div className={activityFooterInner}>
            {footerClue ? (
              <p className="mb-2 text-center text-xs text-[var(--muted-foreground)]">{footerClue}</p>
            ) : null}
            {footer}
          </div>
        </footer>
      ) : null}
    </PlayAtmosphere>
  );
}
