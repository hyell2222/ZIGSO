"use client";

/**
 * 학생 play 단계 UI — 공통 구현은 `@/components/activity/phase-section-layout`.
 */
export { PlayPhaseStatusBanner } from "@/components/play/play-phase-status-banner";
export { PlayStudentTopBanner } from "@/components/play/play-student-top-banner";

export {
  PhaseSectionPanel as PlayPhasePanel,
  PhaseSection as PlayPhaseSection,
  PhaseSectionCard as PlayPhaseSectionCard,
  PhaseSectionBadge as PlayPhaseSectionBadge,
  PhaseSectionCallout as PlayPhaseCallout,
  PhaseSectionWaitFootnote as PlayPhaseWaitFootnote,
  PhaseSectionEmptyState as PlayPhaseEmptyState,
  phaseSectionListRowClass as playPhaseListRowClass,
  PhaseSectionListRow as PlayPhaseListRow,
  PhaseSectionMessage as PlayPhaseMessage,
  phaseSectionFormActions as playPhaseFormActions,
  type PhaseSectionVariant as PlayPhaseSectionVariant,
} from "@/components/activity/phase-section-layout";
