"use client";

import { StadImprovementTable } from "@/components/play/stad-improvement-table";
import { ScoreGuideHelpButton } from "@/components/play/score-guide-help-button";
import {
  GuideInfoModal,
  guideInfoModalParagraphClass,
} from "@/components/play/guide-info-modal";

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
      title="STAD 향상 점수 안내"
      titleId={titleId}
    >
      <p className={guideInfoModalParagraphClass}>
        <strong>'실전 점수 − 기준 점수'</strong>의 성장에 따라 부여되는 점수(0~30점)입니다. 이전보다 실력이 향상되면 누구나 만점(30점)을 획득하여 모둠에 기여할 수 있으며, 모둠원들의 향상 점수 평균이 모둠 최종 성적이 됩니다.
      </p>
      <StadImprovementTable />
    </GuideInfoModal>
  );
}

/** 향상 점수 라벨 옆 — STAD 안내 모달 열기 */
export function StadImprovementHelpButton({ onClick }: { onClick: () => void }) {
  return <ScoreGuideHelpButton ariaLabel="STAD 향상 점수 안내" onClick={onClick} />;
}
