"use client";

import { StadImprovementTable } from "@/components/play/stad/stad-improvement-table";
import { ScoreGuideHelpButton } from "@/components/play/stad/score-guide-help-button";
import {
  GuideInfoModal,
  guideInfoModalBodyClass,
} from "@/components/play/modals/guide-info-modal";

const titleId = "stad-improvement-modal";

type ModalProps = {
  open: boolean;
  onClose: () => void;
};

/** STAD 향상 점수표 — 점수 모달과 별도로 띄우는 안내 모달 */
export function StadImprovementModal({ open, onClose }: ModalProps) {
  return (
    <GuideInfoModal
      open={open}
      onClose={onClose}
      title="향상 점수란?"
      titleId={titleId}
    >
      <p className={guideInfoModalBodyClass}>
        '실전 점수'와 '기준 점수'의 차이에 따라 부여되는 점수입니다. 모둠원들의 '향상 점수' 평균이 모둠의 최종 성적이 됩니다.
      </p>
      <StadImprovementTable />
    </GuideInfoModal>
  );
}

/** 향상 점수 라벨 옆 — STAD 안내 모달 열기 */
export function StadImprovementHelpButton({ onClick }: { onClick: () => void }) {
  return <ScoreGuideHelpButton ariaLabel="STAD 향상 점수 안내" onClick={onClick} />;
}
