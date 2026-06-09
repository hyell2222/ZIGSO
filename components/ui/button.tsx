import { cva, type VariantProps } from "class-variance-authority";
import Link from "next/link";
import { ButtonHTMLAttributes, ComponentProps, forwardRef } from "react";

import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex max-w-full cursor-pointer touch-manipulation select-none items-center justify-center rounded-md text-base font-semibold transition duration-200 disabled:pointer-events-none disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring-focus)] active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--primary)] text-[var(--on-primary)] hover:brightness-95",
        secondary:
          "border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:border-[color-mix(in_srgb,var(--primary)_35%,var(--border))] hover:bg-[var(--tint-primary-weak)]",
        outline:
          "border border-[color-mix(in_srgb,var(--primary)_22%,var(--border))] bg-[var(--surface)] text-[var(--primary)] shadow-[var(--elevation-sm)] hover:border-[color-mix(in_srgb,var(--primary)_38%,var(--border))] hover:bg-[var(--tint-primary-weak)]",
        ghost: "text-[var(--foreground)] hover:bg-[var(--tint-primary-weak)]",
        tab:
          "rounded-none border-b-2 bg-transparent text-[var(--muted-foreground,#94a3b8)] hover:shadow-none active:scale-100",
        danger: "bg-[var(--danger)] text-[var(--on-danger)] hover:brightness-90",
        transparent:
          "rounded-lg border border-[var(--on-primary)]/20 bg-[var(--on-primary)]/10 px-4 text-base font-semibold text-[var(--on-primary)] shadow-sm transition-colors hover:bg-[var(--on-primary)]/18 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60",
        chip:
          "rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:border-[color-mix(in_srgb,var(--primary)_35%,var(--border))] hover:bg-[var(--tint-primary-weak)] active:scale-[0.98]",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 px-3 text-sm",
        lg: "h-11 px-6 text-base sm:h-12 sm:px-8 sm:text-lg",
        icon: "h-8 w-8 min-w-0 shrink-0 p-0",
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

export type ButtonLinkProps = ComponentProps<typeof Link> &
  VariantProps<typeof buttonVariants>;

export function ButtonLink({
  className,
  variant,
  size,
  ...props
}: ButtonLinkProps) {
  return (
    <Link className={cn(buttonVariants({ variant, size }), className)} {...props} />
  );
}

ButtonLink.displayName = "ButtonLink";

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
