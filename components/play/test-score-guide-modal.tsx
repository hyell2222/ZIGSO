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
        4단계 실전 문제에서 맞힌 문항 비율(%)입니다. 활동에 포함된 모든 역할의 실전
        문제를 한 번씩 풀며, 정답 개수 ÷ 전체 문항 수 × 100으로 계산합니다(소수 첫째
        자리 반올림).
      </p>
      <p className={guideInfoModalParagraphClass}>
        이 점수를 2단계에서 만든 기준 점수와 비교해 STAD 향상 점수(0~30점)가
        정해집니다. 향상 점수 옆 ? 버튼에서 점수표를 확인할 수 있습니다.
      </p>
    </GuideInfoModal>
  );
}

/** 실전 점수 라벨 옆 — 안내 모달 열기 */
export function TestScoreGuideHelpButton({ onClick }: { onClick: () => void }) {
  return <ScoreGuideHelpButton ariaLabel="실전 점수 안내" onClick={onClick} />;
}
