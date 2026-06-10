"use client";

import { BaseScorePracticeTable } from "@/components/play/base-score-practice-table";
import {
  GuideInfoModal,
  guideInfoModalParagraphClass,
} from "@/components/play/guide-info-modal";
import {
  PRACTICE_MAX_ATTEMPTS,
  PRACTICE_WRONG_PENALTY,
} from "@/lib/activity-pack/scoring";

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
      title="기준 점수 안내"
      titleId={titleId}
    >
      <p className={guideInfoModalParagraphClass}>
        2단계 연습 문항마다 점수가 매겨지고, 문항별 점수의 평균이 기준 점수(0~100점)입니다.
        4단계 실전 점수와 비교해 STAD 향상 점수가 계산됩니다.
      </p>
      <BaseScorePracticeTable />
    </GuideInfoModal>
  );
}
