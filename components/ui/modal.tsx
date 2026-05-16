"use client";

import { X } from "lucide-react";
import { useEffect, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const panel =
  "border-[var(--border)] bg-[var(--card-bg)] text-[var(--foreground)] shadow-[0_20px_50px_-12px_color-mix(in_srgb,var(--primary)_18%,transparent)]";
const divider = "border-[var(--border)]";
const titleHeadingClass = "text-base font-semibold text-[var(--foreground)]";
const closeMuted =
  "text-[var(--muted-foreground)] hover:bg-[var(--tint-accent)] hover:text-[var(--foreground)]";

export type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  titleId: string;
  children: ReactNode;
  footer?: ReactNode;
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
  overlayClassName?: string;
  headerClassName?: string;
  titleClassName?: string;
  bodyClassName?: string;
  footerClassName?: string;
  titlePrefix?: ReactNode;
};

/**
 * 공통 모달 — 스크림, 헤더(제목+닫기), 본문, 선택 푸터.
 */
export function Modal({
  open,
  onClose,
  title,
  titleId,
  children,
  footer,
  sheetOnNarrow = false,
  maxWidthClassName = "max-w-md",
  zIndexClassName = "z-50",
  closeOnBackdrop = true,
  closeOnEscape = true,
  hideCloseButton = false,
  panelClassName,
  overlayClassName,
  headerClassName,
  titleClassName,
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

  return (
    <div
      className={cn(
        "fixed inset-0 flex backdrop-blur-[2px] transition-colors",
        "pb-[max(1rem,env(safe-area-inset-bottom,0px))] pt-[max(1rem,env(safe-area-inset-top,0px))]",
        "pl-[max(1.25rem,env(safe-area-inset-left,0px))] pr-[max(1.25rem,env(safe-area-inset-right,0px))] sm:pl-[max(1rem,env(safe-area-inset-left,0px))] sm:pr-[max(1rem,env(safe-area-inset-right,0px))]",
        sheetOnNarrow ? "items-end justify-center sm:items-center" : "items-center justify-center",
        overlayClassName ?? "bg-[var(--overlay-scrim)]/85",
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
          panel,
          panelClassName,
        )}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <header
          className={cn(
            "flex shrink-0 items-center justify-between gap-3 border-b px-4 py-3 pl-5",
            divider,
            headerClassName,
          )}
        >
          <div className="flex min-w-0 items-center gap-2">
            {titlePrefix ?? null}
            <h2
              id={titleId}
              className={cn("truncate tracking-tight", titleHeadingClass, titleClassName)}
            >
              {title}
            </h2>
          </div>
          {!hideCloseButton ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={cn("h-9 w-9 shrink-0", closeMuted)}
              onClick={onClose}
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
              divider,
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
