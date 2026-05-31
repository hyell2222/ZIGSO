"use client";

import type { ReactNode } from "react";

import {
  activityFooterChrome,
  activityFooterInner,
  activityLayoutClasses,
  activityMainInner,
  activityPhaseHeaderShell,
} from "@/components/activity/activity-layout-chrome";
import {
  ActivityPhaseHeader,
} from "@/components/activity/activity-phase-header";
import { PlayAtmosphere } from "@/components/play/play-atmosphere";
import { cn } from "@/lib/utils";

export type PlayPhaseShellProps = {
  contained?: boolean;
  header?: {
    phase?: 1 | 2 | 3 | 4;
    title: string;
    description: string;
    stepLabel?: string;
    rightSlot?: ReactNode;
    className?: string;
    meta?: ReactNode;
  };
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
              <ActivityPhaseHeader
                stepNumber={header.phase ?? null}
                as="h1"
                contained={contained}
                title={header.title}
                description={header.description}
                stepLabel={header.stepLabel}
                rightSlot={header.rightSlot}
                className={header.className}
                meta={header.meta}
              />
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
