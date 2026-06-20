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
        2단계 ‘깊게 파고들기’에서 풀었던 전문가 연습 문제의 결과로 나의 <strong>기준 점수(0~100점)</strong>가 정해집니다. 문항마다 정답을 맞히기까지 시도한 오답 횟수에 따라 점수가 매겨지며, 이 점수들의 평균으로 산출됩니다. 이 기준 점수는 4단계 ‘실력 확인하기’에서 얻을 실전 점수와 비교하여 내가 얼마나 성장했는지 측정하는 출발점이 됩니다.
      </p>
      <BaseScorePracticeTable />
    </GuideInfoModal>
  );
}
