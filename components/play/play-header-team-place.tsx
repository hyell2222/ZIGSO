"use client";

import { Loader2 } from "lucide-react";

import { playSurfaceCool } from "@/components/play/play-atmosphere";
import { cn } from "@/lib/utils";

/**
 * 학생 단계 헤더 우측에 표시되는 팀·담당 장소 칩.
 * (실 play 페이지·샌드박스 양쪽에서 동일 외관으로 사용합니다.)
 */
export function PlayHeaderTeamPlace({
  teamName,
  placeName,
  placeLabel = "담당 장소",
  pending,
  className,
  compact = false,
}: {
  teamName: string | null;
  placeName: string | null;
  placeLabel?: string;
  pending?: boolean;
  className?: string;
  /** 샌드박스 패널 등에서 패딩·본문 글자 크기 축소 */
  compact?: boolean;
}) {
  const team = teamName?.trim() || "—";
  const place = placeName?.trim() || "—";

  return (
    <div
      className={cn(
        playSurfaceCool,
        "inline-flex w-fit min-w-0 max-w-full shrink-0 flex-row items-stretch",
        compact ? "px-2 py-1.5" : "px-3 py-2.5",
        "motion-safe:animate-[playRevealUp_0.48s_cubic-bezier(0.22,1,0.36,1)_both]",
        className,
      )}
    >
      {pending ? (
        <div
          className={cn(
            "flex items-center gap-2 font-medium text-[var(--muted-foreground)]",
            compact ? "text-xs" : "text-sm",
          )}
        >
          <Loader2
            className={cn(
              "shrink-0 animate-spin opacity-90",
              compact ? "h-3.5 w-3.5" : "h-4 w-4",
            )}
            aria-hidden
          />
          불러오는 중…
        </div>
      ) : (
        <>
          <div
            className={cn(
              "flex min-w-0 shrink-0 flex-col justify-center sm:max-w-[7.5rem]",
              compact ? "max-w-[5.5rem]" : "max-w-[6.5rem]",
            )}
          >
            <p
              className={cn(
                "font-semibold uppercase tracking-[0.14em] text-[var(--muted-foreground)]",
                compact ? "text-[9px]" : "text-[10px]",
              )}
            >
              팀
            </p>
            <p
              className={cn(
                "mt-1 truncate font-mono font-semibold tabular-nums text-[var(--primary)]",
                compact ? "text-sm" : "text-base",
              )}
            >
              {team}
            </p>
          </div>
          <div
            className={cn(
              "w-px shrink-0 self-stretch bg-[var(--play-border-cool)]",
              compact ? "mx-2 sm:mx-2" : "mx-2.5 sm:mx-3",
            )}
            aria-hidden
          />
          <div
            className={cn(
              "flex min-w-0 flex-1 flex-col justify-center sm:max-w-[16rem]",
              compact ? "max-w-[min(100%,11rem)]" : "max-w-[min(100%,14rem)]",
            )}
          >
            <p
              className={cn(
                "font-semibold uppercase tracking-[0.14em] text-[var(--muted-foreground)]",
                compact ? "text-[9px]" : "text-[10px]",
              )}
            >
              {placeLabel}
            </p>
            <p
              className={cn(
                "mt-1 line-clamp-2 break-words font-semibold leading-snug text-[var(--primary)]",
                compact ? "text-sm leading-snug" : "text-base",
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
