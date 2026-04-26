"use client";

import { Plus, Trash2 } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ListSectionProps = {
  title: ReactNode;
  description?: ReactNode;
  onAdd: () => void;
  addLabel?: string;
  children: ReactNode;
  className?: string;
};

/**
 * 기본 정보 / 조사 구역 등 — 강조 박스 + 동일한「추가」버튼 + 리스트 그리드.
 */
export function WizardListSection({
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
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={onAdd}
          className="shrink-0 gap-0"
        >
          <Plus className="mr-1 h-3.5 w-3.5 shrink-0" aria-hidden />
          {addLabel}
        </Button>
      </div>
      <ul className="mt-2 grid list-none gap-3 p-0">{children}</ul>
    </div>
  );
}

export function WizardListItemCard({
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
  "aria-label"?: string;
};

/** 마법사 리스트 행 삭제 — 1·2단계 동일 스타일 */
export function WizardRowRemoveButton({
  onClick,
  disabled,
  "aria-label": ariaLabel,
}: RemoveProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel ?? "항목 삭제"}
      className="h-8 w-8 shrink-0 text-[var(--muted-foreground)] hover:bg-red-500/10 hover:text-red-800 disabled:cursor-not-allowed disabled:opacity-40"
    >
      <Trash2 className="h-4 w-4" aria-hidden />
    </Button>
  );
}
