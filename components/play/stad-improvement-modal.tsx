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
        STAD 향상 점수는 <strong>‘실전 점수 − 기준 점수’</strong>의 차이(%)를 바탕으로 부여되는 성장의 점수(0~30점)입니다. 학습 성취도가 낮은 학생도 자신의 기준점보다 높은 점수를 얻으면 모둠에 최대 점수(30점)를 보탤 수 있어, 모두가 적극적으로 참여하도록 돕습니다.
      </p>
      <p className={guideInfoModalParagraphClass}>
        만약 연습(기준)과 실전 모두 100점(만점)을 기록한 경우에도 성장을 인정하여 30점 만점이 부여됩니다. 각 모둠원의 향상 점수 평균이 모둠의 최종 협동 점수가 됩니다.
      </p>
      <StadImprovementTable />
    </GuideInfoModal>
  );
}

/** 향상 점수 라벨 옆 — STAD 안내 모달 열기 */
export function StadImprovementHelpButton({ onClick }: { onClick: () => void }) {
  return <ScoreGuideHelpButton ariaLabel="STAD 향상 점수 안내" onClick={onClick} />;
}
