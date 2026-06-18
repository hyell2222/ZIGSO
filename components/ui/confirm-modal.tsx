"use client";

import { useId, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
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

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      titleId={titleId}
      zIndexClassName={Z.modal}
      contentClassName="px-5 py-4"
      footer={
        <>
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button type="button" variant={confirmVariant} size="sm" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {children}
    </Modal>
  );
}
