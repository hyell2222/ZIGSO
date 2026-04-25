import { forwardRef, InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type InputProps = InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-10 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] shadow-[var(--input-inset)] placeholder:text-[var(--muted-foreground)] focus:border-[var(--mystery)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--ring-focus)]",
        className,
      )}
      {...props}
    />
  ),
);

Input.displayName = "Input";
