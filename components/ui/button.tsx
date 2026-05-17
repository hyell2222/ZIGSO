import { cva, type VariantProps } from "class-variance-authority";
import Link from "next/link";
import { ButtonHTMLAttributes, ComponentProps, forwardRef } from "react";

import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-semibold transition duration-200 disabled:pointer-events-none disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring-focus)] active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "cursor-pointer bg-[var(--primary)] text-[var(--on-primary)] hover:brightness-95",
        secondary:
          "cursor-pointer border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] hover:border-[color-mix(in_srgb,var(--mystery)_55%,var(--border))] hover:bg-[var(--tint-accent-medium)]",
        outline:
          "cursor-pointer border border-[color-mix(in_srgb,var(--mystery)_32%,var(--border))] bg-[color-mix(in_srgb,var(--surface)_58%,var(--background))] text-[var(--mystery)] shadow-[0_4px_16px_color-mix(in_srgb,var(--mystery)_4%,transparent)] hover:border-[color-mix(in_srgb,var(--primary)_28%,var(--border))] hover:bg-[color-mix(in_srgb,var(--surface)_88%,var(--background))] hover:text-[color-mix(in_srgb,var(--mystery)_88%,var(--primary))]",
        ghost:
          "cursor-pointer text-[var(--foreground)] hover:bg-[var(--tint-accent)]",
        tab:
          "cursor-pointer rounded-none border-b-2 bg-transparent text-[var(--muted-foreground,#94a3b8)] hover:shadow-none active:scale-100",
        danger:
          "cursor-pointer bg-[var(--danger)] text-[var(--on-danger)] hover:brightness-90",
        transparent:
          "cursor-pointer rounded-lg border border-[var(--on-primary)]/20 bg-[var(--on-primary)]/10 px-4 text-sm font-semibold text-[var(--on-primary)] shadow-sm transition-colors hover:bg-[var(--on-primary)]/18 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60",
        chip:
          "cursor-pointer rounded-full border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] hover:border-[color-mix(in_srgb,var(--mystery)_55%,var(--border))] hover:bg-[var(--tint-accent-medium)] active:scale-[0.98]",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-12 min-w-[200px] px-8 text-base",
        icon: "h-8 w-8 min-w-0 p-0",
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
