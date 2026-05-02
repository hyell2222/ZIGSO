"use client";

import { Plus, Trash2 } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type HintProps = {
  children: ReactNode;
  className?: string;
};

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

/** 단계 상단 안내 박스 — 톤·테두리 통일 */
export function StepHint({ children, className }: HintProps) {
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

type ListSectionProps = {
  title: ReactNode;
  description?: ReactNode;
  onAdd: () => void;
  addLabel?: string;
  children: ReactNode;
  className?: string;
};

/** 제목 + 「추가」 + 카드 목록 — 장소·용의자 등 편집용 */
export function StepListSection({
  title,
  description,
  onAdd,
  addLabel = "추가",
  children,
  className,
}: ListSectionProps) {
  return (
    <div
      className={cn(
        "space-y-2 rounded-md border border-[var(--border)] bg-[var(--tint-accent-weak)] p-3",
        className,
      )}
    >
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="min-w-0">
          <div className="text-xs font-semibold text-[var(--accent)]">{title}</div>
          {description != null && description !== "" ? (
            <p className="mt-0.5 text-[11px] leading-snug text-[var(--muted-foreground)]">
              {description}
            </p>
          ) : null}
        </div>
        <Button type="button" size="sm" variant="secondary" onClick={onAdd} className="shrink-0 gap-0">
          <Plus className="mr-1 h-3.5 w-3.5 shrink-0" aria-hidden />
          {addLabel}
        </Button>
      </div>
      <ul className="mt-2 grid list-none gap-3 p-0">{children}</ul>
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
