"use client";

import { ScoreGuideHelpButton } from "@/components/play/score-guide-help-button";
import {
  GuideInfoModal,
  guideInfoModalParagraphClass,
} from "@/components/play/guide-info-modal";

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
      title="실전 점수 안내"
      titleId={titleId}
    >
      <p className={guideInfoModalParagraphClass}>
        4단계에서 치른 <strong>실전 문제의 정답률(%)</strong>입니다. 모둠원들이 설명해 준 모든 파트의 문제가 골고루 평가되며, 이 실전 점수와 기준 점수를 비교하여 최종 STAD 향상 점수(0~30점)가 결정됩니다.
      </p>
    </GuideInfoModal>
  );
}

/** 실전 점수 라벨 옆 — 안내 모달 열기 */
export function TestScoreGuideHelpButton({ onClick }: { onClick: () => void }) {
  return <ScoreGuideHelpButton ariaLabel="실전 점수 안내" onClick={onClick} />;
}
