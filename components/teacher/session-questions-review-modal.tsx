"use client";

import { createPortal } from "react-dom";
import { useMemo } from "react";

import {
  PhaseSection,
  PhaseSectionPanel,
} from "@/components/activity/phase-section-layout";
import { PracticeQuestionCard } from "@/components/play/practice-question-card";
import { QuizQuestionList } from "@/components/play/quiz-question-list";
import { Modal } from "@/components/ui/modal";
import { getTestQuestions } from "@/lib/activity-pack/engine";
import type { ActivityPack } from "@/lib/activity-pack/types";
import { RESULTS_COPY } from "@/lib/activity-phases";
import { codenameForRole } from "@/lib/play/role-codenames";
import { Z } from "@/lib/ui/z-index";

const modalTitleId = "session-questions-review-heading";
const QUESTIONS_REVIEW_MODAL_MAX_WIDTH = "w-[min(100%,42rem)]";

type Props = {
  open: boolean;
  onClose: () => void;
  pack: ActivityPack;
  roleScopeKey?: string;
  /** false — 실세션 전체 화면. true — 샌드박스 교사 패널 안 (기본값) */
  contained?: boolean;
};

export function SessionQuestionsReviewModal({
  open,
  onClose,
  pack,
  roleScopeKey = "",
  contained = true,
}: Props) {
  const roleIds = useMemo(() => pack.roles.map((r) => r.id), [pack.roles]);
  const testQuestions = useMemo(() => getTestQuestions(pack), [pack]);

  const roleSections = useMemo(
    () =>
      pack.roles
        .map((role) => ({
          role,
          label: codenameForRole(roleScopeKey, role.id, roleIds),
          questions: role.practiceQuestions,
        }))
        .filter((section) => section.questions.length > 0),
    [pack.roles, roleIds, roleScopeKey],
  );

  if (!open) return null;

  const modal = (
    <Modal
      open
      onClose={onClose}
      variant={contained ? "contained" : "viewport"}
      title={RESULTS_COPY.reviewQuestionsTitle}
      titleId={modalTitleId}
      zIndexClassName={Z.hostTool}
      maxWidthClassName={QUESTIONS_REVIEW_MODAL_MAX_WIDTH}
      className="max-h-[min(90dvh,800px)]"
      contentClassName="px-5 py-4"
    >
      <PhaseSectionPanel>
        {roleSections.map(({ role, label, questions }) => (
          <PhaseSection
            key={role.id}
            title={`${label} · 연습 문제`}
            variant="active"
            heading="section"
          >
            <div className="space-y-4">
              {questions.map((q, idx) => (
                <PracticeQuestionCard
                  key={q.id}
                  question={q}
                  index={idx}
                  onComplete={() => {}}
                  initialResult={{
                    wrongAttempts: 0,
                    baseScore: 100,
                    choiceIndex: q.correctIndex,
                  }}
                  disabled
                  scored={false}
                />
              ))}
            </div>
          </PhaseSection>
        ))}

        {testQuestions.length > 0 ? (
          <PhaseSection title="실전 문제" variant="active" heading="section">
            <QuizQuestionList
              questions={testQuestions}
              selected={{}}
              reveal
              disabled
            />
          </PhaseSection>
        ) : null}
      </PhaseSectionPanel>
    </Modal>
  );

  if (!contained && typeof document !== "undefined") {
    return createPortal(modal, document.body);
  }

  return modal;
}
