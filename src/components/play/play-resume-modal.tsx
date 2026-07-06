"use client";

import { PlayJoinReadonlyFields } from "@/components/play/play-join-form";
import { Modal } from "@/components/ui/modal";
import { Z } from "@/lib/ui/z-index";
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
      title="활동 참가"
      titleId={titleId}
      zIndexClassName={modalVariant === "contained" ? Z.containedOverlay : Z.modal}
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
        <PlayJoinReadonlyFields titleId={titleId} joinCode={joinCode} nickname={nickname} />
        <div className="flex flex-col gap-2 pt-4">
          <Button type="submit" className="w-full">
            이어서 참가하기
          </Button>
          <Button type="button" variant="outline" className="w-full" onClick={onNew}>
            새 닉네임으로 입장
          </Button>
        </div>
      </form>
    </Modal>
  );
}
