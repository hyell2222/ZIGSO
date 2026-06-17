"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { PlayPhaseShell } from "@/components/play/play-phase-shell";
import {
  PlayPhaseMessage,
  PlayPhasePanel,
  PlayPhaseSection,
  PlayPhaseSectionBadge,
  PlayStudentTopBanner,
  playPhaseFormActions,
} from "@/components/play/play-phase-layout";
import { PlayQuestionHelperText, PlaySegmentText } from "@/components/play/play-question-support";
import { BaseScoreGuideModal } from "@/components/play/base-score-guide-modal";
import { GuideInfoModal } from "@/components/play/guide-info-modal";
import { QuizSubmitSummary } from "@/components/play/quiz-submit-summary";
import { StadImprovementModal } from "@/components/play/stad-improvement-modal";
import { TestScoreGuideModal } from "@/components/play/test-score-guide-modal";
import {
  QuizQuestionList,
  answersToSelected,
  selectedToAnswers,
} from "@/components/play/quiz-question-list";
import { Button } from "@/components/ui/button";
import { PLAYER_MESSAGES, gradeQuiz, getTestQuestionSections, getTestQuestions } from "@/lib/activity-pack/engine";
import { buildStadScoreSnapshot } from "@/lib/activity-pack/stad-guide";
import { codenameForRole } from "@/lib/play/role-codenames";
import type { ActivityPack, QuizAnswer } from "@/lib/activity-pack/types";

type Props = {
  pack: ActivityPack;
  groupName: string | null;
  roleLabel?: string | null;
  roleScopeKey?: string;
  /** 2단계 연습으로 정해진 기준 점수 (0~100) */
  baseScore?: number | null;
  /** 이미 제출한 응답 (있으면 결과 표시) */
  submittedAnswers?: QuizAnswer[];
  submittedAt?: string | null;
  onSubmit: (answers: QuizAnswer[]) => void | Promise<void>;
  onUpdate?: () => void;
  pending?: boolean;
};

const scoreModalTitleId = "individual-quiz-score-modal";

export function IndividualQuizPanel({
  pack,
  groupName,
  roleLabel,
  roleScopeKey = "",
  baseScore,
  submittedAnswers,
  submittedAt,
  onSubmit,
  onUpdate,
  pending,
}: Props) {
  const questions = useMemo(() => getTestQuestions(pack), [pack]);
  const testSections = useMemo(() => getTestQuestionSections(pack), [pack]);
  const roleIds = useMemo(() => pack.roles.map((r) => r.id), [pack.roles]);
  const questionOffsets = useMemo(() => {
    let offset = 0;
    return testSections.map((section) => {
      const start = offset;
      offset += section.questions.length;
      return start;
    });
  }, [testSections]);
  const submitted = Boolean(submittedAt);
  const [justSubmitted, setJustSubmitted] = useState(false);
  const isSubmitted = submitted || justSubmitted;
  const [scoreModalOpen, setScoreModalOpen] = useState(false);
  const [stadGuideOpen, setStadGuideOpen] = useState(false);
  const [baseScoreGuideOpen, setBaseScoreGuideOpen] = useState(false);
  const [testScoreGuideOpen, setTestScoreGuideOpen] = useState(false);

  const [selected, setSelected] = useState<Record<string, number>>(() =>
    submittedAnswers ? answersToSelected(submittedAnswers) : {},
  );
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const answers = selectedToAnswers(questions, selected);
  const answeredCount = answers.length;
  const allAnswered = answeredCount >= questions.length && questions.length > 0;

  const resultAnswers = isSubmitted ? (submittedAnswers ?? answers) : [];
  const grade = useMemo(
    () => gradeQuiz(questions, resultAnswers),
    [questions, resultAnswers],
  );

  const scoreSnapshot = useMemo(
    () => buildStadScoreSnapshot(baseScore, grade.correctCount, questions.length),
    [baseScore, grade.correctCount, questions.length],
  );

  useEffect(() => {
    if (justSubmitted) setScoreModalOpen(true);
  }, [justSubmitted]);

  const handleSubmit = async () => {
    setMessage(null);
    setBusy(true);
    try {
      await onSubmit(answers);
      setJustSubmitted(true);
      onUpdate?.();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : PLAYER_MESSAGES.operationFailed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <PlayPhaseShell
      topBanner={
        <PlayStudentTopBanner
          phase="individual_quiz"
          groupName={groupName}
          placeName={roleLabel ?? "—"}
          placeLabel="역할"
          pending={pending}
        />
      }
      overlay={
        <>
          {isSubmitted ? (
            <GuideInfoModal
              open={scoreModalOpen}
              onClose={() => setScoreModalOpen(false)}
              title="제출 완료!"
              titleId={scoreModalTitleId}
            >
              <QuizSubmitSummary
                snapshot={scoreSnapshot}
                onOpenBaseScoreGuide={() => setBaseScoreGuideOpen(true)}
                onOpenTestScoreGuide={() => setTestScoreGuideOpen(true)}
                onOpenStadGuide={() => setStadGuideOpen(true)}
              />
            </GuideInfoModal>
          ) : null}
          <BaseScoreGuideModal
            open={baseScoreGuideOpen}
            onClose={() => setBaseScoreGuideOpen(false)}
          />
          <StadImprovementModal
            open={stadGuideOpen}
            onClose={() => setStadGuideOpen(false)}
          />
          <TestScoreGuideModal
            open={testScoreGuideOpen}
            onClose={() => setTestScoreGuideOpen(false)}
          />
        </>
      }
    >
      <PlayPhasePanel>
        <PlayPhaseSection
          title={isSubmitted ? "제출한 답" : "실전 문제"}
          variant="active"
          headerExtra={
            <div className="flex items-center gap-2">
              {isSubmitted ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => setScoreModalOpen(true)}
                >
                  점수 보기
                </Button>
              ) : null}
              <PlayPhaseSectionBadge>
                {isSubmitted
                  ? `${grade.correctCount}/${questions.length} 정답`
                  : `${answeredCount}/${questions.length} 문항`}
              </PlayPhaseSectionBadge>
            </div>
          }
        >
          <div className="space-y-5">
            {testSections.map((section, sectionIndex) => {
              const sectionLabel = codenameForRole(roleScopeKey, section.roleId, roleIds);
              return (
                <PlayPhaseSection
                  key={section.roleId}
                  title={sectionLabel}
                  variant="active"
                >
                  <PlaySegmentText className="mb-4">{section.segment}</PlaySegmentText>
                  <QuizQuestionList
                    questions={section.questions}
                    selected={selected}
                    onSelect={(qid, ci) => setSelected((prev) => ({ ...prev, [qid]: ci }))}
                    disabled={busy || isSubmitted}
                    reveal={isSubmitted}
                    startIndex={questionOffsets[sectionIndex] ?? 0}
                  />
                </PlayPhaseSection>
              );
            })}
          </div>
          {!isSubmitted ? (
            <>
              <PlayQuestionHelperText className="mt-4">
                {allAnswered
                  ? "답을 모두 골랐어요. 제출 후에는 수정할 수 없어요."
                  : "모든 문항에 답하면 제출할 수 있어요. 실전 문제는 한 번만 응시합니다."}
              </PlayQuestionHelperText>
              <div className={playPhaseFormActions}>
                <Button
                  type="button"
                  className="shrink-0 gap-2 min-h-10 touch-manipulation @md:min-h-11"
                  onClick={() => void handleSubmit()}
                  disabled={busy || !allAnswered}
                >
                  {busy ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin text-[var(--primary)]" aria-hidden />
                      제출 중…
                    </>
                  ) : (
                    "제출"
                  )}
                </Button>
              </div>
            </>
          ) : null}
        </PlayPhaseSection>

        {message ? <PlayPhaseMessage message={message} /> : null}
      </PlayPhasePanel>
    </PlayPhaseShell>
  );
}
