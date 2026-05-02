"use client";

import { Trash2 } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type StepHeadingProps = {
  /** 1-based 단계 번호 (상단 스테퍼와 동일) */
  step: 1 | 2 | 3 | 4;
  title: string;
  subtitle?: string;
  className?: string;
};

/** 사건 만들기 카드 상단 — 단계별 제목 UI 통일 (번호 + 제목 + 한 줄 설명) */
export function StepHeading({ step, title, subtitle, className }: StepHeadingProps) {
  return (
    <div className={cn("flex items-start gap-3", className)}>
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--primary)] bg-[var(--primary)] text-[11px] font-semibold tabular-nums text-[var(--on-primary)] shadow-sm"
        aria-hidden
      >
        {step}
      </span>
      <div className="min-w-0 flex-1 space-y-0.5 pt-0.5">
        <h3 className="text-base font-semibold tracking-wide text-[var(--mystery)]">{title}</h3>
        {subtitle ? (
          <p className="text-xs leading-snug text-[var(--muted-foreground)]">{subtitle}</p>
        ) : null}
      </div>
    </div>
  );
}

export function StepListItemCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <li
      className={cn(
        "rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-3",
        className,
      )}
    >
      {children}
    </li>
  );
}

type RemoveProps = {
  onClick: () => void;
  disabled?: boolean;
};

export function StepListRemoveButton({
  onClick,
  disabled,
}: RemoveProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={onClick}
      disabled={disabled}
      className="h-8 w-8 shrink-0 text-[var(--muted-foreground)] hover:bg-[var(--danger)]/10 hover:text-[var(--danger)] disabled:cursor-not-allowed disabled:opacity-40"
    >
      <Trash2 className="h-4 w-4" aria-hidden />
    </Button>
  );
}
