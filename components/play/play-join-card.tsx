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
  description = "선생님이 알려준 참가 코드와 닉네임을 입력하세요.",
  titleId = "play-join-card",
  submitLabel = "참가하기",
  pendingLabel = "확인 중…",
  ...formProps
}: PlayJoinCardProps) {
  return (
    <Modal title={title} titleId={titleId}>
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
