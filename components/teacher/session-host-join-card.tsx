"use client";

import { PlayJoinQr } from "@/components/teacher/play-join-qr";
import { cn } from "@/lib/utils";

type Props = {
  joinCode: string;
  sessionEnded?: boolean;
};

export function SessionHostJoinCard({ joinCode, sessionEnded = false }: Props) {
  return (
    <div className="ml-auto w-fit max-w-full shrink-0 self-end @sm:self-auto">
      <div
        className={cn(
          "flex w-fit min-w-0 items-center justify-start gap-2 rounded-lg border border-[var(--border)] bg-[var(--card-bg)] px-2.5 py-2 shadow-[var(--elevation-sm)]",
          "@md:px-3 @md:py-2.5",
          sessionEnded && "mx-auto justify-center",
        )}
      >
        {sessionEnded ? (
          <div className="py-0.5 text-center @sm:text-left">
            <p className="mt-0.5 font-mono text-sm font-medium tracking-wide text-[var(--muted-foreground)] @md:text-base">
              종료된 세션
            </p>
          </div>
        ) : (
          <>
            <div className="leading-tight">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted-foreground)] @md:text-xs @md:tracking-wider">
                참가 코드
              </p>
              <p
                className={cn(
                  "font-mono text-base font-semibold tracking-[0.12em] text-[var(--accent)] tabular-nums",
                  "@md:text-lg @md:tracking-[0.15em] @lg:text-xl @xl:text-2xl",
                )}
              >
                {joinCode}
              </p>
            </div>
            <span className="h-7 w-px bg-[var(--border)] @md:h-9" aria-hidden />
            <PlayJoinQr joinCode={joinCode} />
          </>
        )}
      </div>
    </div>
  );
}
