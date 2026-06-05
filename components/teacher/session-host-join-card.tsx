"use client";

import { PlayJoinQr } from "@/components/teacher/play-join-qr";
import { cn } from "@/lib/utils";

type Props = {
  joinCode: string;
  sessionEnded?: boolean;
  contained?: boolean;
};

export function SessionHostJoinCard({ joinCode, sessionEnded = false, contained = false }: Props) {
  return (
    <div className="w-fit max-w-full shrink-0">
      <div
        className={cn(
          "flex w-fit min-w-0 items-center justify-start gap-2 rounded-xl border border-[color-mix(in_srgb,var(--primary)_12%,var(--border))]",
          "bg-[var(--surface-overlay)] px-2.5 py-2 shadow-[var(--elevation-sm)]",
          "@md:gap-2.5 @md:px-3 @md:py-2.5",
        )}
      >
        {sessionEnded ? (
          <div className="py-0.5">
            <p
              className={cn(
                "font-mono font-medium tracking-wide text-[var(--muted-foreground)]",
                contained ? "text-xs" : "text-sm @md:text-base",
              )}
            >
              종료된 세션
            </p>
          </div>
        ) : (
          <>
            <PlayJoinQr joinCode={joinCode} />
            <span className="h-7 w-px bg-[var(--border)] @md:h-9" aria-hidden />
            <div className="leading-tight">
              <p
                className={cn(
                  "font-semibold uppercase tracking-[0.14em] text-[var(--muted-foreground)]",
                  contained ? "text-[10px]" : "text-[10px] @md:text-xs @md:tracking-wider",
                )}
              >
                참가 코드
              </p>
              <p
                className={cn(
                  "font-mono font-bold tracking-[0.12em] text-[var(--primary)] tabular-nums",
                  contained ? "text-sm" : "text-base @md:text-lg @md:tracking-[0.15em] @lg:text-xl",
                )}
              >
                {joinCode}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
