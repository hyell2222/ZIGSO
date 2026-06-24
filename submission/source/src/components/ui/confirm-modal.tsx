"use client";

import { useEffect, useId, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Z } from "@/lib/ui/z-index";

export type ConfirmModalProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  onConfirm: () => void;
  children: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: "danger" | "default";
};

export function ConfirmModal({
  open,
  title,
  onClose,
  onConfirm,
  children,
  confirmLabel = "삭제",
  cancelLabel = "취소",
  confirmVariant = "danger",
}: ConfirmModalProps) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className={cn(
        Z.modal,
        "fixed inset-0 flex items-center justify-center px-4 py-6",
        "pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] pt-[max(1.5rem,env(safe-area-inset-top,0px))]",
      )}
      role="presentation"
    >
      <div
        className="absolute inset-0 bg-[var(--overlay-scrim)]/85 backdrop-blur-[2px]"
        aria-hidden
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          "relative z-10 w-full max-w-[min(100%,20rem)] cursor-default",
          "rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--elevation-md)]",
          "motion-safe:animate-[playModalRise_0.4s_cubic-bezier(0.22,1,0.36,1)_both]",
        )}
      >
        <h2 id={titleId} className="text-base font-semibold text-[var(--foreground)]">
          {title}
        </h2>

        <div className="mt-2 space-y-1.5 text-sm text-[var(--muted-foreground)] [&>p:first-child]:text-[var(--foreground)]">
          {children}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button type="button" variant={confirmVariant} size="sm" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
