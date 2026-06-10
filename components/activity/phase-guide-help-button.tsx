"use client";

import { useState } from "react";

import { PhaseStepGuideModal } from "@/components/activity/phase-step-guide-modal";
import { ScoreGuideHelpButton } from "@/components/play/score-guide-help-button";
import { getPhaseStepGuide, type PhaseGuideKey } from "@/lib/activity-phases";

type Props = {
  phase: PhaseGuideKey;
  className?: string;
};

/** 단계 제목 옆 — 단계 안내 모달 열기 */
export function PhaseGuideHelpButton({ phase, className }: Props) {
  const [open, setOpen] = useState(false);
  const guide = getPhaseStepGuide(phase);

  return (
    <>
      <ScoreGuideHelpButton
        ariaLabel={`${guide.title} 단계 안내`}
        onClick={() => setOpen(true)}
        className={className}
      />
      <PhaseStepGuideModal phase={phase} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
