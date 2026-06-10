"use client";

import {
  GuideInfoModal,
  guideInfoModalListClass,
  guideInfoModalParagraphClass,
} from "@/components/play/guide-info-modal";
import { getPhaseStepGuide, type PhaseGuideKey } from "@/lib/activity-phases";

type Props = {
  phase: PhaseGuideKey;
  open: boolean;
  onClose: () => void;
};

/** 단계 제목 옆 ? — 단계별 안내 모달 */
export function PhaseStepGuideModal({ phase, open, onClose }: Props) {
  const guide = getPhaseStepGuide(phase);
  const titleId = `phase-step-guide-${phase}`;

  return (
    <GuideInfoModal
      open={open}
      onClose={onClose}
      title={`${guide.number}단계 · ${guide.title}`}
      titleId={titleId}
    >
      <p className={guideInfoModalParagraphClass}>{guide.intro}</p>
      <ul className={guideInfoModalListClass}>
        {guide.details.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </GuideInfoModal>
  );
}
