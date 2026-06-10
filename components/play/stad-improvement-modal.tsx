"use client";

import { StadImprovementTable } from "@/components/play/stad-improvement-table";
import { ScoreGuideHelpButton } from "@/components/play/score-guide-help-button";
import { Modal } from "@/components/ui/modal";
import { activityLayoutType } from "@/components/activity/activity-layout-typography";
import { Z } from "@/lib/ui/z-index";
import { cn } from "@/lib/utils";

const t = activityLayoutType;
const titleId = "stad-improvement-modal";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  contained?: boolean;
};

/** STAD 향상 점수표 — 점수 모달과 별도로 띄우는 안내 모달 */
export function StadImprovementModal({ open, onClose, contained = false }: ModalProps) {
  const modalVariant = contained ? "contained" : "viewport";

  return (
    <Modal
      open={open}
      onClose={onClose}
      variant={modalVariant}
      title="STAD 향상 점수 안내"
      titleId={titleId}
      zIndexClassName={Z.hostTool}
      sheetOnNarrow
      maxWidthClassName="w-full max-w-[min(100%,24rem)]"
    >
      <p className={cn("mb-3", t.caption)}>
        기준 점수(연습)와 실전 점수(%) 차이로 0~30점을 정합니다.
      </p>
      <StadImprovementTable />
    </Modal>
  );
}

/** 향상 점수 라벨 옆 — STAD 안내 모달 열기 */
export function StadImprovementHelpButton({ onClick }: { onClick: () => void }) {
  return <ScoreGuideHelpButton ariaLabel="STAD 향상 점수 안내" onClick={onClick} />;
}
