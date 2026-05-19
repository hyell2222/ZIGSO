"use client";

import type { ReactNode } from "react";

import {
  activityFooterChrome,
  activityFooterInner,
  activityLayoutClasses,
  activityMainInner,
  activityPhaseHeaderShell,
} from "@/components/activity/activity-layout-chrome";
import { PlayAtmosphere } from "@/components/play/play-atmosphere";
import {
  PlayPhaseHeader,
  type PlayPhaseHeaderProps,
} from "@/components/play/play-phase-header";
import { cn } from "@/lib/utils";

export type PlayPhaseShellProps = {
  contained?: boolean;
  header?: PlayPhaseHeaderProps;
  footer?: ReactNode;
  footerClue?: ReactNode;
  mainClassName?: string;
  children: ReactNode;
};

export function PlayPhaseShell({
  contained = false,
  header,
  footer,
  footerClue,
  mainClassName,
  children,
}: PlayPhaseShellProps) {
  const layout = activityLayoutClasses(contained);

  return (
    <PlayAtmosphere variant={contained ? "contained" : "viewport"}>
      <div className="flex h-full min-h-0 w-full flex-1 flex-col">
        {header ? (
          <header className={cn(activityPhaseHeaderShell, "z-20")}>
            <div className={layout.phaseHeaderInner}>
              <PlayPhaseHeader {...header} contained={contained} />
            </div>
          </header>
        ) : null}

        <main className={activityMainInner}>
          <div className={cn(layout.mainContent, mainClassName)}>{children}</div>
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
