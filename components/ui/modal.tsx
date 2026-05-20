"use client";

import { X } from "lucide-react";
import { useEffect, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** 다이얼로그·인라인 폼 공통 최대 너비 */
export const MODAL_DEFAULT_MAX_WIDTH = "w-full max-w-[min(100%,28rem)]";

const closeMuted =
  "text-[var(--muted-foreground)] hover:bg-[var(--tint-primary-weak)] hover:text-[var(--foreground)]";

type ModalPanelProps = {
  title: string;
  titleId: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  contentClassName?: string;
  footerClassName?: string;
  maxWidthClassName?: string;
  hideCloseButton?: boolean;
  onClose?: () => void;
};

function ModalPanel({
  title,
  titleId,
  children,
  footer,
  className,
  contentClassName,
  footerClassName,
  maxWidthClassName = MODAL_DEFAULT_MAX_WIDTH,
  hideCloseButton = false,
  onClose,
}: ModalPanelProps) {
  const showClose = Boolean(onClose) && !hideCloseButton;

  return (
    <Card
      className={cn(
        "mx-auto flex max-h-[min(92dvh,880px)] min-w-0 flex-col",
        maxWidthClassName,
        className,
      )}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <CardHeader className="flex shrink-0 flex-row items-center justify-between gap-3 py-3">
        <CardTitle id={titleId} className="min-w-0 flex-1 truncate">
          {title}
        </CardTitle>
        {showClose ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn("h-9 w-9 shrink-0", closeMuted)}
            onClick={onClose}
            aria-label="닫기"
          >
            <X className="h-4 w-4" aria-hidden />
          </Button>
        ) : null}
      </CardHeader>

      <CardContent className={cn("min-h-0 flex-1 overflow-y-auto", contentClassName)}>
        {children}
      </CardContent>

      {footer ? (
        <div
          className={cn(
            "flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-[var(--border)] px-5 py-3",
            footerClassName,
          )}
        >
          {footer}
        </div>
      ) : null}
    </Card>
  );
}

export type ModalProps = ModalPanelProps & {
  /** `boolean`이면 스크림 오버레이. 생략 시 페이지 중앙 인라인 카드(로그인·/play 입장) */
  open?: boolean;
  variant?: "viewport" | "contained";
  zIndexClassName?: string;
  overlayClassName?: string;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  /** 모바일 하단 시트 → `sm:`에서 중앙 */
  sheetOnNarrow?: boolean;
};

/**
 * 공통 모달 — Card 패널 + 선택적 스크림 오버레이.
 * 로그인·참가·타이머·QR·AI 생성 등 모든 다이얼로그에 사용.
 */
export function Modal({
  open,
  onClose,
  title,
  titleId,
  children,
  footer,
  variant = "viewport",
  zIndexClassName = "z-50",
  overlayClassName,
  closeOnBackdrop,
  closeOnEscape = true,
  sheetOnNarrow = false,
  hideCloseButton = false,
  className,
  contentClassName,
  footerClassName,
  maxWidthClassName,
}: ModalProps) {
  const isOverlay = open !== undefined;
  const canDismiss = Boolean(onClose);
  const dismissOnBackdrop = canDismiss && (closeOnBackdrop ?? true);

  useEffect(() => {
    if (!isOverlay || !open || !canDismiss || !closeOnEscape) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOverlay, open, canDismiss, closeOnEscape, onClose]);

  const panel = (
    <ModalPanel
      title={title}
      titleId={titleId}
      footer={footer}
      className={className}
      contentClassName={contentClassName}
      footerClassName={footerClassName}
      maxWidthClassName={maxWidthClassName}
      hideCloseButton={hideCloseButton}
      onClose={canDismiss ? onClose : undefined}
    >
      {children}
    </ModalPanel>
  );

  if (!isOverlay) {
    return panel;
  }

  if (!open) return null;

  return (
    <div
      className={cn(
        variant === "contained" ? "absolute inset-0" : "fixed inset-0",
        "flex backdrop-blur-[2px]",
        "px-4 py-6",
        "pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] pt-[max(1.5rem,env(safe-area-inset-top,0px))]",
        sheetOnNarrow ? "items-end justify-center sm:items-center" : "items-center justify-center",
        overlayClassName ?? "bg-[var(--overlay-scrim)]/85",
        zIndexClassName,
      )}
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget && dismissOnBackdrop) onClose?.();
      }}
    >
      <div className="w-full motion-safe:animate-[playModalRise_0.4s_cubic-bezier(0.22,1,0.36,1)_both]">
        {panel}
      </div>
    </div>
  );
}
