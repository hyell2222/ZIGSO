import { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-cyan-500/60 bg-cyan-500/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-cyan-300",
        className,
      )}
      {...props}
    />
  );
}
