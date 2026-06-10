"use client";

import type { ReactNode } from "react";

import { Modal } from "@/components/ui/modal";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  titleId: string;
  children: ReactNode;
  contained?: boolean;
};

/** 학생 play — 단계 완료·제출 점수 안내 (닫기 가능) */
export function PlayScoreModal({
  open,
  onClose,
  title,
  titleId,
  children,
  contained = false,
}: Props) {
  const modalVariant = contained ? "contained" : "viewport";

  return (
    <Modal
      open={open}
      onClose={onClose}
      variant={modalVariant}
      title={title}
      titleId={titleId}
      zIndexClassName={contained ? "z-20" : "z-50"}
      sheetOnNarrow
      maxWidthClassName="w-full max-w-[min(100%,32rem)]"
    >
      {children}
    </Modal>
  );
}
