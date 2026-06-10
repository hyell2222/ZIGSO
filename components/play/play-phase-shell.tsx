"use client";

import type { ReactNode } from "react";

import {
  activityFooterChrome,
  activityFooterInner,
  activityLayoutClasses,
  activityMainInner,
} from "@/components/activity/activity-layout-chrome";
import { PlayAtmosphere } from "@/components/play/play-atmosphere";
import { Z } from "@/lib/ui/z-index";
import { cn } from "@/lib/utils";

export type PlayPhaseShellProps = {
  contained?: boolean;
  /** 상단 배너 — 단계·모둠·역할·완료 안내 */
  topBanner?: ReactNode;
  footer?: ReactNode;
  footerClue?: ReactNode;
  mainClassName?: string;
  /** 패널 전체(배너 포함)를 덮는 오버레이 — 샌드박스 contained 모달 */
  overlay?: ReactNode;
  children: ReactNode;
};

export function PlayPhaseShell({
  contained = false,
  topBanner,
  footer,
  footerClue,
  mainClassName,
  overlay,
  children,
}: PlayPhaseShellProps) {
  const layout = activityLayoutClasses(contained);

  return (
    <PlayAtmosphere variant={contained ? "contained" : "viewport"}>
      <div className="relative flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden">
        {overlay}
        {topBanner ? (
          <div
            className={cn(
              Z.playBanner,
              "w-full shrink-0",
              !contained && "pt-[env(safe-area-inset-top,0px)]",
            )}
          >
            {topBanner}
          </div>
        ) : null}

        <main
          className={cn(
            activityMainInner,
            layout.mainContent,
            "flex flex-col gap-4 @sm:gap-5",
            mainClassName,
          )}
        >
          {children}
        </main>

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
      </div>
    </PlayAtmosphere>
  );
}
