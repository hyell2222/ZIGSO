"use client";

import { PLAY_JOIN_COPY } from "@/components/play/play-join-copy";
import { PlayJoinReadonlyFields } from "@/components/play/play-join-form";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  joinCode: string;
  nickname: string;
  onContinue: () => void;
  onNew: () => void;
  modalVariant?: "viewport" | "contained";
};

const titleId = "play-resume-modal";

/** 이전 입장 기록 — 공통 모달 UI */
export function PlayResumeModal({
  open,
  joinCode,
  nickname,
  onContinue,
  onNew,
  modalVariant = "viewport",
}: Props) {
  return (
    <Modal
      open={open}
      variant={modalVariant}
      title={PLAY_JOIN_COPY.title}
      titleId={titleId}
      zIndexClassName={modalVariant === "contained" ? "z-20" : "z-50"}
      closeOnBackdrop={false}
      closeOnEscape={false}
      hideCloseButton
    >
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          onContinue();
        }}
      >
        <p className="text-xs text-[var(--foreground)]">{PLAY_JOIN_COPY.resumeDescription}</p>
        <PlayJoinReadonlyFields titleId={titleId} joinCode={joinCode} nickname={nickname} />
        <div className="flex flex-col gap-2 pt-4">
          <Button type="submit" className="w-full">
            {PLAY_JOIN_COPY.resumeContinueLabel}
          </Button>
          <Button type="button" variant="outline" className="w-full" onClick={onNew}>
            {PLAY_JOIN_COPY.resumeNewNicknameLabel}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
