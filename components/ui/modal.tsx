"use client";

import { X } from "lucide-react";
import { useEffect, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const VARIANT = {
  teacher: {
    panel:
      "border-[var(--border)] bg-[var(--card-bg)] text-[var(--foreground)] shadow-[0_24px_60px_-12px_rgba(0,0,0,0.35)]",
    divider: "border-[var(--border)]",
    title: "text-base font-semibold text-[var(--foreground)]",
    closeMuted: "text-[var(--muted-foreground)] hover:bg-[var(--tint-accent)] hover:text-[var(--foreground)]",
  },
  play: {
    panel:
      "border-[color-mix(in_srgb,var(--primary)_26%,transparent)] bg-[color-mix(in_srgb,var(--mystery)_78%,var(--ink))] text-[color:var(--entry-parchment)] shadow-[0_24px_60px_color-mix(in_srgb,var(--ink)_48%,transparent)] ring-1 ring-[color-mix(in_srgb,var(--primary)_18%,transparent)]",
    divider:
      "border-[color-mix(in_srgb,var(--primary)_18%,transparent)] bg-[color-mix(in_srgb,var(--mystery)_55%,#151210)]",
    title: "text-base font-semibold text-[color:var(--entry-parchment)]",
    closeMuted:
      "text-[color:var(--entry-parchment-muted)] hover:bg-[color-mix(in_srgb,var(--entry-parchment)_8%,transparent)] hover:text-[color:var(--entry-parchment)]",
  },
} as const;

export type ModalVariant = keyof typeof VARIANT;

export type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  titleId: string;
  children: ReactNode;
  footer?: ReactNode;
  variant?: ModalVariant;
  /** 모바일에서는 하단 정렬 후 `sm:`에서 중앙 (예: 역할 상세 패널) */
  sheetOnNarrow?: boolean;
  /** 기본 max-w-md */
  maxWidthClassName?: string;
  /** 패널 z-index (tailwind 클래스) */
  zIndexClassName?: string;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  hideCloseButton?: boolean;
  panelClassName?: string;
  bodyClassName?: string;
  footerClassName?: string;
  titlePrefix?: ReactNode;
};

/**
 * 교사 도구 화면·플레이 화면 공통 모달 레이아웃 — 스크림, 헤더(제목+닫기), 본문, 선택 푸터.
 */
export function Modal({
  open,
  onClose,
  title,
  titleId,
  children,
  footer,
  variant = "teacher",
  sheetOnNarrow = false,
  maxWidthClassName = "max-w-md",
  zIndexClassName = "z-50",
  closeOnBackdrop = true,
  closeOnEscape = true,
  hideCloseButton = false,
  panelClassName,
  bodyClassName,
  footerClassName,
  titlePrefix,
}: ModalProps) {
  useEffect(() => {
    if (!open || !closeOnEscape) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, closeOnEscape, onClose]);

  if (!open) return null;

  const v = VARIANT[variant];

  return (
    <div
      className={cn(
        "fixed inset-0 flex p-4 backdrop-blur-[2px] transition-colors",
        sheetOnNarrow ? "items-end justify-center sm:items-center" : "items-center justify-center",
        "bg-[var(--overlay-scrim)]/85",
        zIndexClassName,
      )}
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget && closeOnBackdrop) onClose();
      }}
    >
      <div
        className={cn(
          "flex max-h-[min(92dvh,880px)] w-full flex-col overflow-hidden rounded-xl border motion-safe:animate-[playModalRise_0.4s_cubic-bezier(0.22,1,0.36,1)_both]",
          maxWidthClassName,
          v.panel,
          panelClassName,
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <header className={cn("flex shrink-0 items-center justify-between gap-3 border-b px-4 py-3 pl-5", v.divider)}>
          <div className="flex min-w-0 items-center gap-2">
            {titlePrefix ?? null}
            <h2 id={titleId} className={cn("truncate tracking-tight", v.title)}>
              {title}
            </h2>
          </div>
          {!hideCloseButton ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={cn("h-9 w-9 shrink-0", v.closeMuted)}
              onClick={onClose}
              aria-label="닫기"
            >
              <X className="h-4 w-4" aria-hidden />
            </Button>
          ) : null}
        </header>

        <div className={cn("min-h-0 flex-1 overflow-y-auto px-5 py-4", bodyClassName)}>{children}</div>

        {footer ? (
          <footer
            className={cn(
              "flex shrink-0 flex-wrap items-center justify-end gap-2 border-t px-5 py-3",
              v.divider,
              footerClassName,
            )}
          >
            {footer}
          </footer>
        ) : null}
      </div>
    </div>
  );
}
