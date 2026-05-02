import { cva, type VariantProps } from "class-variance-authority";
import Link from "next/link";
import { ButtonHTMLAttributes, ComponentProps, forwardRef } from "react";

import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-xl text-sm font-semibold transition duration-200 disabled:pointer-events-none disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring-focus)] active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "cursor-pointer bg-[var(--primary)] text-[var(--on-primary)] shadow-[0_6px_22px_color-mix(in_srgb,var(--primary)_28%,transparent)] hover:brightness-[0.96] hover:shadow-[0_10px_28px_color-mix(in_srgb,var(--primary)_22%,transparent)]",
        secondary:
          "cursor-pointer border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] hover:bg-[var(--surface)]",
        outline:
          "cursor-pointer border border-[color-mix(in_srgb,var(--mystery)_32%,var(--border))] bg-[color-mix(in_srgb,var(--surface)_58%,var(--background))] text-[var(--mystery)] shadow-[0_4px_16px_color-mix(in_srgb,var(--mystery)_4%,transparent)] hover:border-[color-mix(in_srgb,var(--primary)_28%,var(--border))] hover:bg-[color-mix(in_srgb,var(--surface)_88%,var(--background))] hover:text-[color-mix(in_srgb,var(--mystery)_88%,var(--primary))]",
        ghost:
          "cursor-pointer text-[var(--foreground)] shadow-none hover:bg-[var(--tint-accent)] hover:shadow-none",
        tab:
          "cursor-pointer rounded-none border-b-2 bg-transparent text-[var(--muted-foreground,#94a3b8)] shadow-none hover:shadow-none active:scale-100",
        danger:
          "cursor-pointer bg-[var(--danger)] text-[var(--on-danger)] shadow-[0_6px_20px_color-mix(in_srgb,var(--danger)_22%,transparent)] hover:brightness-90 hover:shadow-[0_8px_24px_color-mix(in_srgb,var(--danger)_18%,transparent)]",
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
