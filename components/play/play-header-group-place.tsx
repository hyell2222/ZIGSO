"use client";

import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * 학생 단계 헤더 우측에 표시되는 모둠·담당 장소 칩.
 * (실 play 페이지·샌드박스 양쪽에서 동일 외관으로 사용합니다.)
 */
export function PlayHeaderGroupPlace({
  groupName,
  placeName,
  placeLabel = "나의 역할",
  pending,
  className,
  contained = false,
}: {
  groupName: string | null;
  placeName: string | null;
  placeLabel?: string;
  pending?: boolean;
  className?: string;
  contained?: boolean;
}) {
  const group = groupName?.trim() || "—";
  const place = placeName?.trim() || "—";

  return (
    <div
      className={cn(
        "inline-flex w-fit min-w-0 max-w-full shrink-0 flex-row items-stretch rounded-lg border border-[var(--border)] bg-[var(--card-bg)] shadow-[var(--elevation-sm)]",
        contained ? "px-2 py-1" : "px-2 py-1.5 @sm:px-3 @sm:py-2.5",
        "motion-safe:animate-[playRevealUp_0.48s_cubic-bezier(0.22,1,0.36,1)_both]",
        className,
      )}
    >
      {pending ? (
        <div className="flex items-center gap-2 text-xs font-medium text-[var(--muted-foreground)] @sm:text-sm">
          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin opacity-90 @sm:h-4 @sm:w-4" aria-hidden />
          불러오는 중…
        </div>
      ) : (
        <>
          <div className="flex min-w-0 max-w-[5.5rem] shrink-0 flex-col justify-center @sm:max-w-[6.5rem] @md:max-w-[7.5rem]">
            <p
              className={cn(
                "font-semibold uppercase tracking-[0.14em] text-[var(--muted-foreground)]",
                contained ? "text-[10px]" : "text-xs",
              )}
            >
              모둠
            </p>
            <p
              className={cn(
                "mt-0.5 truncate font-mono font-semibold tabular-nums text-[var(--primary)]",
                contained ? "text-xs" : "mt-1 text-sm @sm:text-base",
              )}
            >
              {group}
            </p>
          </div>
          <div className="mx-2 w-px shrink-0 self-stretch bg-[var(--border)] @sm:mx-2.5" aria-hidden />
          <div className="flex min-w-0 max-w-[min(100%,11rem)] flex-1 flex-col justify-center @sm:max-w-[min(100%,14rem)] @md:max-w-[16rem]">
            <p
              className={cn(
                "font-semibold uppercase tracking-[0.14em] text-[var(--muted-foreground)]",
                contained ? "text-[10px]" : "text-xs",
              )}
            >
              {placeLabel}
            </p>
            <p
              className={cn(
                "line-clamp-2 break-words font-semibold leading-snug text-[var(--primary)]",
                contained ? "mt-0.5 text-xs" : "mt-1 text-sm @sm:text-base",
              )}
            >
              {place}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
