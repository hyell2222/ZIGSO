"use client";

import { Modal } from "@/components/ui/modal";
import { JOIN_COPY } from "@/lib/copy/join";
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
  title = JOIN_COPY.title,
  description = JOIN_COPY.description,
  titleId = "play-join-modal",
  submitLabel = JOIN_COPY.submitLabel,
  pendingLabel = JOIN_COPY.pendingLabel,
  ...formProps
}: Props) {
  return (
    <Modal
      open={open}
      variant={modalVariant}
      title={title}
      titleId={titleId}
      zIndexClassName={modalVariant === "contained" ? "z-20" : "z-50"}
      closeOnBackdrop={false}
      closeOnEscape={false}
      hideCloseButton
    >
      {description ? (
        <p className="text-xs text-[var(--foreground)]">{description}</p>
      ) : null}
      <PlayJoinForm
        titleId={titleId}
        submitLabel={submitLabel}
        pendingLabel={pendingLabel}
        className={description ? "pt-3" : undefined}
        {...formProps}
      />
    </Modal>
  );
}
