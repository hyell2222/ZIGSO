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
        STAD 향상 점수는 실전 점수에서 기준 점수를 뺀 차이(%)로 0~30점을 부여합니다.
        연습·실전 모두 100점이면 차이가 0이어도 향상 점수 30점(만점)입니다.
      </p>
      <p className={guideInfoModalParagraphClass}>
        향상 점수는 개인 성과와 모둠 순위에 반영됩니다.
      </p>
      <StadImprovementTable />
    </GuideInfoModal>
  );
}

/** 향상 점수 라벨 옆 — STAD 안내 모달 열기 */
export function StadImprovementHelpButton({ onClick }: { onClick: () => void }) {
  return <ScoreGuideHelpButton ariaLabel="STAD 향상 점수 안내" onClick={onClick} />;
}
