"use client";

import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

type Variant = "banner" | "floating";

/** 학생 play — 모둠·역할 배지 */
export function PlayHeaderGroupPlace({
  groupName,
  placeName,
  placeLabel = "나의 역할",
  pending,
  className,
  contained = false,
  variant = "banner",
}: {
  groupName: string | null;
  placeName: string | null;
  placeLabel?: string;
  pending?: boolean;
  className?: string;
  contained?: boolean;
  variant?: Variant;
}) {
  const group = groupName?.trim() || "—";
  const place = placeName?.trim() || "—";
  const isBanner = variant === "banner";

  return (
    <div
      className={cn(
        "inline-flex w-fit min-w-0 max-w-full shrink-0 flex-row items-stretch",
        isBanner
          ? cn(
              "rounded-lg border border-[color-mix(in_srgb,var(--play-border-cool)_60%,var(--border))]",
              "bg-[color-mix(in_srgb,var(--play-panel)_96%,transparent)]",
              contained ? "px-2 py-1.5" : "px-2.5 py-1.5 @sm:px-3 @sm:py-2",
            )
          : cn(
              "rounded-2xl border-2 border-[color-mix(in_srgb,var(--play-border-cool)_70%,var(--border))]",
              "bg-[color-mix(in_srgb,var(--play-panel)_94%,transparent)] shadow-[var(--play-shadow-lift)] backdrop-blur-md",
              "motion-safe:animate-[playRevealUp_0.48s_cubic-bezier(0.22,1,0.36,1)_both]",
              contained
                ? "px-3 py-2.5 @sm:px-3.5 @sm:py-3"
                : "px-4 py-3 @sm:px-5 @sm:py-3.5 @md:px-6 @md:py-4",
            ),
        className,
      )}
    >
      {pending ? (
        <div
          className={cn(
            "flex items-center gap-1.5 font-medium text-[var(--muted-foreground)]",
            isBanner || contained ? "text-[10px] @sm:text-xs" : "text-sm @sm:text-base",
          )}
        >
          <Loader2
            className={cn("shrink-0 animate-spin opacity-90", isBanner ? "h-3 w-3" : "h-4 w-4")}
            aria-hidden
          />
          불러오는 중…
        </div>
      ) : (
        <>
          <div
            className={cn(
              "flex min-w-0 shrink-0 flex-col justify-center",
              isBanner
                ? contained
                  ? "max-w-[4.5rem]"
                  : "max-w-[5rem] @sm:max-w-[5.5rem]"
                : contained
                  ? "max-w-[6rem] @sm:max-w-[7rem]"
                  : "max-w-[7rem] @sm:max-w-[8.5rem] @md:max-w-[9.5rem]",
            )}
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted-foreground)] @sm:text-xs">
              모둠
            </p>
            <p
              className={cn(
                "truncate font-mono font-bold tabular-nums text-[var(--primary)]",
                isBanner
                  ? contained
                    ? "text-xs"
                    : "text-xs @sm:text-sm"
                  : contained
                    ? "text-sm @sm:text-base"
                    : "text-lg @sm:text-xl @md:text-2xl",
              )}
            >
              {group}
            </p>
          </div>
          <div className="mx-1.5 w-px shrink-0 self-stretch bg-[var(--border)] @sm:mx-2" aria-hidden />
          <div
            className={cn(
              "flex min-w-0 flex-1 flex-col justify-center",
              isBanner
                ? "max-w-[min(100%,8rem)] @sm:max-w-[min(100%,10rem)]"
                : "max-w-[min(100%,14rem)] @sm:max-w-[min(100%,18rem)] @md:max-w-[20rem]",
            )}
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted-foreground)] @sm:text-xs">
              {placeLabel}
            </p>
            <p
              className={cn(
                "line-clamp-2 break-words font-bold leading-snug text-[var(--primary)]",
                isBanner
                  ? contained
                    ? "text-xs"
                    : "text-xs @sm:text-sm"
                  : contained
                    ? "text-sm @sm:text-base"
                    : "text-base @sm:text-lg @md:text-xl",
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
