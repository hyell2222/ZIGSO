"use client";

import { BaseScorePracticeTable } from "@/components/play/base-score-practice-table";
import { Modal } from "@/components/ui/modal";
import { activityLayoutType } from "@/components/activity/activity-layout-typography";
import {
  PRACTICE_MAX_ATTEMPTS,
  PRACTICE_WRONG_PENALTY,
} from "@/lib/activity-pack/scoring";
import { Z } from "@/lib/ui/z-index";
import { cn } from "@/lib/utils";

const t = activityLayoutType;
const titleId = "base-score-guide-modal";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  contained?: boolean;
};

/** 기준 점수 안내 — 점수 모달과 별도로 띄우는 안내 모달 */
export function BaseScoreGuideModal({ open, onClose, contained = false }: ModalProps) {
  const modalVariant = contained ? "contained" : "viewport";

  return (
    <Modal
      open={open}
      onClose={onClose}
      variant={modalVariant}
      title="기준 점수 안내"
      titleId={titleId}
      zIndexClassName={Z.hostTool}
      sheetOnNarrow
      maxWidthClassName="w-full max-w-[min(100%,24rem)]"
    >
      <p className={cn("mb-3", t.caption)}>
        2단계 연습 문항 점수의 평균이 기준 점수(0~100점)예요. 4단계 실전 점수와 비교해 STAD
        향상 점수가 정해집니다.
      </p>
      <p className={cn("mb-3", t.caption)}>
        문항마다 최대 {PRACTICE_MAX_ATTEMPTS}번까지 제출할 수 있으며, 오답마다{" "}
        {PRACTICE_WRONG_PENALTY}점씩 감점됩니다.
      </p>
      <BaseScorePracticeTable />
    </Modal>
  );
}
