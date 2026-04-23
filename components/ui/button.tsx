import { cva, type VariantProps } from "class-variance-authority";
import { ButtonHTMLAttributes, forwardRef } from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "cursor-pointer bg-[var(--primary)] text-[var(--foreground)] hover:bg-[#651010]",
        secondary: "cursor-pointer bg-[var(--surface)] text-[var(--foreground)] hover:bg-[#2d3134]",
        outline:
          "cursor-pointer border border-[var(--accent)]/60 text-[var(--accent)] hover:bg-[rgba(201,209,107,0.1)]",
        ghost: "cursor-pointer text-[var(--foreground)] hover:bg-[rgba(36,40,43,0.85)]",
        tab:
          "cursor-pointer rounded-none border-b-2 border-transparent bg-transparent text-[var(--muted-foreground,#94a3b8)] hover:bg-[rgba(36,40,43,0.85)] hover:text-[var(--foreground)]",
        danger: "cursor-pointer bg-[var(--primary)] text-[var(--foreground)] hover:bg-[#5a0909]",
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
