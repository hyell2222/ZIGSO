import { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-[color-mix(in_srgb,var(--primary)_28%,var(--border))] bg-[var(--tint-primary-weak)] px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-[var(--primary)]",
        className,
      )}
      {...props}
    />
  );
}
