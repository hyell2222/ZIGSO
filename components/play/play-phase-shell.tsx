"use client";

import type { ReactNode } from "react";

import {
  PlayAtmosphere,
  playPhaseFooterChrome,
  playPhaseHeaderChromeInner,
  playPhaseHeaderChromeShell,
  playPhaseMainContent,
  playPhaseMainInner,
} from "@/components/play/play-atmosphere";
import { PlayPhaseHeader, type PlayPhaseHeaderProps } from "@/components/play/play-phase-header";
import { cn } from "@/lib/utils";

export type PlayPhaseShellProps = {
  /** 샌드박스 분할 패널 등 — 뷰포트 대신 부모 높이에 맞춤 (타이포는 @container 반응형) */
  contained?: boolean;
  header?: PlayPhaseHeaderProps;
  footer?: ReactNode;
  footerHint?: ReactNode;
  mainClassName?: string;
  children: ReactNode;
};

export function PlayPhaseShell({
  contained = false,
  header,
  footer,
  footerHint,
  mainClassName,
  children,
}: PlayPhaseShellProps) {
  return (
    <PlayAtmosphere variant={contained ? "contained" : "viewport"}>
      <div className="flex h-full min-h-0 w-full flex-1 flex-col">
        {header ? (
          <header className={cn(playPhaseHeaderChromeShell, "z-20 shrink-0")}>
            <div className={playPhaseHeaderChromeInner}>
              <PlayPhaseHeader {...header} />
            </div>
          </header>
        ) : null}

        <main className={playPhaseMainInner}>
          <div className={cn(playPhaseMainContent, mainClassName)}>{children}</div>
        </main>

        {footer || footerHint ? (
          <footer className={playPhaseFooterChrome}>
            {footerHint ? (
              <p className="mb-2 text-center text-xs text-[var(--muted-foreground)]">{footerHint}</p>
            ) : null}
            {footer}
          </footer>
        ) : null}
      </div>
    </PlayAtmosphere>
  );
}
