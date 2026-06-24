"use client";

import { Modal } from "@/components/ui/modal";
import { Z } from "@/lib/ui/z-index";
import { PlayJoinForm, type PlayJoinFormProps } from "@/components/play/play-join-form";

type Props = Omit<PlayJoinFormProps, "className"> & {
  open: boolean;
  modalVariant?: "viewport" | "contained";
  title?: string;
  description?: string;
};

/** 참가 모달 — 로그인·기타 모달과 동일 UI */
export function PlayJoinModal({
  open,
  modalVariant = "viewport",
  title = "활동 참가",
  titleId = "play-join-modal",
  submitLabel = "참가하기",
  ...formProps
}: Props) {
  return (
    <Modal
      open={open}
      variant={modalVariant}
      title={title}
      titleId={titleId}
      zIndexClassName={modalVariant === "contained" ? Z.containedOverlay : Z.modal}
      closeOnEscape={false}
      hideCloseButton
    >
      <PlayJoinForm
        titleId={titleId}
        submitLabel={submitLabel}
        {...formProps}
      />
    </Modal>
  );
}
