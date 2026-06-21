"use client";

import { BaseScorePracticeTable } from "@/components/play/base-score-practice-table";
import {
  GuideInfoModal,
  guideInfoModalParagraphClass,
} from "@/components/play/guide-info-modal";

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
        내가 공부한 파트의 <strong>연습 문제 풀이 결과(평균)</strong>입니다. 정답을 맞힐 때까지 시도한 오답 횟수에 따라 문항별 점수가 결정되며, 4단계 실전 퀴즈와 대조하여 성장을 측정하는 출발점이 됩니다.
      </p>
      <BaseScorePracticeTable />
    </GuideInfoModal>
  );
}
