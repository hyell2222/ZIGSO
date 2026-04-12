import { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-[var(--accent)]/60 bg-[rgba(201,209,107,0.1)] px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-[var(--accent)]",
        className,
      )}
      {...props}
    />
  );
}
