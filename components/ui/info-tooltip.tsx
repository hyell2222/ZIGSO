"use client";

import { CircleHelp } from "lucide-react";
import { useId, useState, type ReactNode } from "react";

import { activityLayoutType } from "@/components/activity/activity-layout-typography";
import { cn } from "@/lib/utils";

const t = activityLayoutType;

type Props = {
  /** 스크린 리더용 — 툴팁 주제 */
  label: string;
  children: ReactNode;
  className?: string;
  panelClassName?: string;
  align?: "start" | "center" | "end";
};

/** 물음표 아이콘 + 클릭·포커스로 여는 안내 툴팁 */
export function InfoTooltip({
  label,
  children,
  className,
  panelClassName,
  align = "center",
}: Props) {
  const [open, setOpen] = useState(false);
  const tooltipId = useId();

  return (
    <span className={cn("relative inline-flex shrink-0", className)}>
      <button
        type="button"
        aria-expanded={open}
        aria-describedby={open ? tooltipId : undefined}
        aria-label={label}
        onClick={() => setOpen((value) => !value)}
        onBlur={(event) => {
          if (!event.currentTarget.parentElement?.contains(event.relatedTarget as Node | null)) {
            setOpen(false);
          }
        }}
        className={cn(
          "inline-flex h-5 w-5 items-center justify-center rounded-full",
          "text-[var(--muted-foreground)] transition-colors",
          "hover:bg-[var(--tint-primary-weak)] hover:text-[var(--primary)]",
          open && "bg-[var(--tint-primary-weak)] text-[var(--primary)]",
        )}
      >
        <CircleHelp className="h-3.5 w-3.5" aria-hidden />
      </button>
      {open ? (
        <div
          id={tooltipId}
          role="tooltip"
          className={cn(
            "absolute top-full z-20 mt-1.5 w-[min(18rem,calc(100vw-2rem))] rounded-lg border border-[var(--border)]",
            panelClassName,
            "bg-[var(--card-bg)] p-3 shadow-[var(--elevation-md)]",
            align === "start" && "left-0",
            align === "center" && "left-1/2 -translate-x-1/2",
            align === "end" && "right-0",
          )}
        >
          <div className={cn("space-y-1.5", t.caption)}>{children}</div>
        </div>
      ) : null}
    </span>
  );
}
