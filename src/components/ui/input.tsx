import { forwardRef, InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type InputProps = InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-10 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-base text-[var(--foreground)] shadow-[var(--input-inset)] placeholder:text-[var(--muted-foreground)] focus:border-[color-mix(in_srgb,var(--primary)_45%,var(--border))] focus:outline-none focus:ring-2 focus:ring-[var(--ring-focus)]",
        className,
      )}
      {...props}
    />
  ),
);

Input.displayName = "Input";
