"use client";

import { ScoreGuideHelpButton } from "@/components/play/stad/score-guide-help-button";
import {
  GuideInfoModal,
  guideInfoModalBodyClass,
} from "@/components/play/modals/guide-info-modal";

const titleId = "test-score-guide-modal";

type ModalProps = {
  open: boolean;
  onClose: () => void;
};

/** 실전 점수 안내 */
export function TestScoreGuideModal({ open, onClose }: ModalProps) {
  return (
    <GuideInfoModal
      open={open}
      onClose={onClose}
      title="실전 점수란?"
      titleId={titleId}
    >
      <p className={guideInfoModalBodyClass}>
        '실전 문제'의 문항별 점수 평균입니다. '기준 점수'와 비교해 '향상 점수'를 계산하는 데 사용됩니다.
      </p>
    </GuideInfoModal>
  );
}

/** 실전 점수 라벨 옆 — 안내 모달 열기 */
export function TestScoreGuideHelpButton({ onClick }: { onClick: () => void }) {
  return <ScoreGuideHelpButton ariaLabel="실전 점수 안내" onClick={onClick} />;
}
