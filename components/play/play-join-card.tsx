"use client";

import { Modal } from "@/components/ui/modal";
import { PLAY_JOIN_COPY } from "@/components/play/play-join-copy";
import { PlayJoinForm, type PlayJoinFormProps } from "@/components/play/play-join-form";

export type PlayJoinCardProps = Omit<PlayJoinFormProps, "className"> & {
  title?: string;
  description?: string;
};

/** `/play/` 입장 페이지·오버레이 공통 참가 카드 */
export function PlayJoinCard({
  title = PLAY_JOIN_COPY.title,
  description = PLAY_JOIN_COPY.description,
  titleId = "play-join-card",
  submitLabel = PLAY_JOIN_COPY.submitLabel,
  pendingLabel = PLAY_JOIN_COPY.pendingLabel,
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
