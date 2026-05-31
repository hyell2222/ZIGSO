"use client";

import { Modal } from "@/components/ui/modal";
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
  description = "선생님이 알려준 참가 코드와 닉네임을 입력하세요.",
  titleId = "play-join-modal",
  submitLabel = "참가하기",
  pendingLabel = "확인 중…",
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
