import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type Props = {
  children: ReactNode;
  className?: string;
};

/**
 * 사건 마법사 단계 상단 안내 문구 — 단계 간 동일한 톤·테두리.
 */
export function WizardStepHint({ children, className }: Props) {
  return (
    <div
      className={cn(
        "rounded-md border border-[var(--border)] bg-[var(--tint-accent-weak)] px-3 py-2.5 text-sm leading-relaxed text-[var(--foreground)] [&_strong]:font-semibold [&_strong]:text-[var(--accent)]",
        className,
      )}
    >
      {children}
    </div>
  );
}
