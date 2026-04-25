import { cva, type VariantProps } from "class-variance-authority";
import { ButtonHTMLAttributes, forwardRef } from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "cursor-pointer bg-[var(--primary)] text-[var(--on-primary)] hover:brightness-95",
        secondary:
          "cursor-pointer border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] hover:bg-[var(--surface)]",
        outline:
          "cursor-pointer border border-[var(--mystery)]/45 text-[var(--mystery)] hover:bg-[var(--tint-mystery)]",
        ghost: "cursor-pointer text-[var(--foreground)] hover:bg-[var(--tint-accent)]",
        tab:
          "cursor-pointer rounded-none border-b-2 bg-transparent text-[var(--muted-foreground,#94a3b8)]",
        danger: "cursor-pointer bg-[var(--danger)] text-[var(--on-danger)] hover:brightness-90",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-11 px-6",
        icon: "h-8 w-8 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size }), className)}
        ref={ref}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";
