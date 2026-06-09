"use client";

import { Modal } from "@/components/ui/modal";
import { PlayJoinForm, type PlayJoinFormProps } from "@/components/play/play-join-form";

export type PlayJoinCardProps = Omit<PlayJoinFormProps, "className"> & {
  title?: string;
  description?: string;
};

/** `/play/` 입장 페이지·오버레이 공통 참가 카드 */
export function PlayJoinCard({
  title = "활동 참가",
  titleId = "play-join-card",
  submitLabel = "참가하기",
  pendingLabel = "확인 중…",
  ...formProps
}: PlayJoinCardProps) {
  return (
    <Modal title={title} titleId={titleId}>
      <PlayJoinForm
        titleId={titleId}
        submitLabel={submitLabel}
        pendingLabel={pendingLabel}
        {...formProps}
      />
    </Modal>
  );
}
