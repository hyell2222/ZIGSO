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
        4단계 ‘실력 확인하기’에서 치른 실전 문제의 <strong>정답률(%)</strong>입니다. 내 역할뿐만 아니라 모둠원들이 설명해 준 모든 역할의 내용을 골고루 평가하며, [맞힌 문항 수 ÷ 전체 실전 문항 수 × 100]으로 계산하고 소수 첫째 자리에서 반올림합니다.
      </p>
      <p className={guideInfoModalParagraphClass}>
        이 실전 점수를 2단계에서 기록한 기준 점수와 대조하여 최종 STAD 향상 점수(0~30점)가 매겨집니다. 향상 점수 옆 ? 버튼에서 향상 점수 계산표를 확인할 수 있습니다.
      </p>
    </GuideInfoModal>
  );
}

/** 실전 점수 라벨 옆 — 안내 모달 열기 */
export function TestScoreGuideHelpButton({ onClick }: { onClick: () => void }) {
  return <ScoreGuideHelpButton ariaLabel="실전 점수 안내" onClick={onClick} />;
}
