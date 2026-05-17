"use client";

import type { ReactNode } from "react";

import {
  PlayAtmosphere,
  playPhaseFooterChrome,
  playPhaseHeaderChromeInner,
  playPhaseHeaderChromeShell,
  playPhaseMainInner,
} from "@/components/play/play-atmosphere";
import { PlayPhaseHeader, type PlayPhaseHeaderProps } from "@/components/play/play-phase-header";
import { cn } from "@/lib/utils";

export type PlayPhaseShellProps = {
  embedded?: boolean;
  /** 대기·결과 등 전용 화면에서는 생략 */
  header?: PlayPhaseHeaderProps;
  footer?: ReactNode;
  footerHint?: ReactNode;
  mainClassName?: string;
  children: ReactNode;
};

export function PlayPhaseShell({
  embedded = false,
  header,
  footer,
  footerHint,
  mainClassName,
  children,
}: PlayPhaseShellProps) {
  return (
    <PlayAtmosphere variant={embedded ? "contained" : "viewport"}>
      <div className={cn("flex flex-col", embedded ? "min-h-0 flex-1" : "min-h-dvh")}>
        {header ? (
          <header className={cn(playPhaseHeaderChromeShell, "sticky top-0 z-20")}>
            <div className={playPhaseHeaderChromeInner}>
              <PlayPhaseHeader {...header} compact={header.compact ?? embedded} />
            </div>
          </header>
        ) : null}

        <main className={cn(playPhaseMainInner, mainClassName)}>{children}</main>

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
