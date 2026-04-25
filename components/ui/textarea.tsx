import { forwardRef, TextareaHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "min-h-24 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] shadow-[var(--input-inset)] placeholder:text-[var(--muted-foreground)] focus:border-[var(--mystery)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--ring-focus)]",
        className,
      )}
      {...props}
    />
  ),
);

Textarea.displayName = "Textarea";
