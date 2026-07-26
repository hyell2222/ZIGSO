"use client";

import { BaseScorePracticeTable } from "@/components/play/stad/base-score-practice-table";
import {
  GuideInfoModal,
  guideInfoModalBodyClass,
} from "@/components/play/modals/guide-info-modal";

const titleId = "base-score-guide-modal";

type ModalProps = {
  open: boolean;
  onClose: () => void;
};

/** 기준 점수 안내 — 점수 모달과 별도로 띄우는 안내 모달 */
export function BaseScoreGuideModal({ open, onClose }: ModalProps) {
  return (
    <GuideInfoModal
      open={open}
      onClose={onClose}
      title="기준 점수란?"
      titleId={titleId}
    >
      <p className={guideInfoModalBodyClass}>
        '연습 문제'의 문항별 점수 평균입니다. 오답 횟수에 따라 정해지며, '실전 점수'와 비교해 '향상 점수'를 계산하는 데 사용됩니다.
      </p>
      <BaseScorePracticeTable />
    </GuideInfoModal>
  );
}
