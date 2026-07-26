"use client";

import { Loader2, Sparkles } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { PlayPhaseShell } from "@/components/play/shell/play-phase-shell";
import { PlayStudentTopBanner } from "@/components/play/shell/play-student-top-banner";
import {
  PhaseSectionPanel as PlayPhasePanel,
  PhaseSection as PlayPhaseSection,
  PhaseSectionBadge as PlayPhaseSectionBadge,
  PhaseSectionMessage as PlayPhaseMessage,
  phaseSectionFormActions as playPhaseFormActions,
} from "@/components/activity/phase-section-layout";
import { PlayQuestionHelperText, PlayQuestionExplanation } from "@/components/play/quiz/play-question-support";
import { BaseScoreGuideModal } from "@/components/play/modals/base-score-guide-modal";
import { GuideInfoModal } from "@/components/play/modals/guide-info-modal";
import { QuizSubmitSummary } from "@/components/play/quiz/quiz-submit-summary";
import { StadImprovementModal } from "@/components/play/modals/stad-improvement-modal";
import { TestScoreGuideModal } from "@/components/play/modals/test-score-guide-modal";
import {
  QuizQuestionList,
  answersToSelected,
  selectedToAnswers,
} from "@/components/play/quiz/quiz-question-list";
import { Button } from "@/components/ui/button";
import { PLAYER_MESSAGES, gradeQuiz, getTestQuestionSections, getTestQuestions } from "@/lib/activity-pack/engine";
import { buildStadScoreSnapshot } from "@/lib/activity-pack/stad-guide";
import { codenameForRole } from "@/lib/play/role-codenames";
import type { ActivityPack, QuizAnswer } from "@/lib/activity-pack/types";
import { cn } from "@/lib/utils";
import { fetchAiExplanation } from "@/lib/api/explain";

type AiExplanation = { hint1: string; hint2: string; explanation: string };

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

  const [busy, setBusy] = useState(false);
  const submitted = Boolean(submittedAt);
  const [justSubmitted, setJustSubmitted] = useState(false);
  const [isSubmittedLocal, setIsSubmittedLocal] = useState(submitted);

  useEffect(() => {
    if (submitted && !busy) {
      setIsSubmittedLocal(true);
    }
  }, [submitted, busy]);

  const isSubmitted = isSubmittedLocal || justSubmitted;
  const [scoreModalOpen, setScoreModalOpen] = useState(false);
  const [stadGuideOpen, setStadGuideOpen] = useState(false);
  const [baseScoreGuideOpen, setBaseScoreGuideOpen] = useState(false);
  const [testScoreGuideOpen, setTestScoreGuideOpen] = useState(false);

  const [selected, setSelected] = useState<Record<string, number>>(() =>
    submittedAnswers ? answersToSelected(submittedAnswers) : {},
  );
  const [message, setMessage] = useState<string | null>(null);

  const answers = selectedToAnswers(questions, selected);
  const answeredCount = answers.length;
  const allAnswered = answeredCount >= questions.length && questions.length > 0;

  const grade = useMemo(
    () => gradeQuiz(questions, isSubmitted ? (submittedAnswers ?? answers) : []),
    [questions, isSubmitted, submittedAnswers, answers],
  );

  const scoreSnapshot = useMemo(
    () => buildStadScoreSnapshot(baseScore, grade.correctCount, questions.length),
    [baseScore, grade.correctCount, questions.length],
  );

  const [aiExplanations, setAiExplanations] = useState<Record<string, AiExplanation>>({});
  const [loadingExplanations, setLoadingExplanations] = useState(false);

  const allExplanationsLoaded = useMemo(() => {
    return questions.every((q) => aiExplanations[q.id]);
  }, [questions, aiExplanations]);

  const fetchAllExplanations = useCallback(async (targetAnswers: QuizAnswer[]) => {
    setLoadingExplanations(true);
    const newExplanations: Record<string, AiExplanation> = {};

    try {
      const segment = pack.roles.map((r) => r.segment).filter(Boolean).join("\n\n");
      const promises = questions.map(async (q) => {
        if (!segment) {
          newExplanations[q.id] = { hint1: "", hint2: "", explanation: "내용을 찾을 수 없어 해설을 생성할 수 없습니다." };
          return;
        }

        const chosenAnswer = targetAnswers.find((a) => a.questionId === q.id);
        const chosenIndex = chosenAnswer?.choiceIndex;
        const wrongChoices = chosenIndex !== undefined && chosenIndex !== q.correctIndex ? [chosenIndex] : [];

        try {
          const data = await fetchAiExplanation({
            passage: segment,
            question: q.prompt,
            choices: q.choices,
            correctIndex: q.correctIndex,
            wrongChoices,
          });
          newExplanations[q.id] = data;
        } catch (err) {
          console.error(`Failed to fetch AI explanation for question ${q.id}:`, err);
          newExplanations[q.id] = { hint1: "", hint2: "", explanation: "해설을 불러오는데 실패했습니다." };
        }
      });

      await Promise.all(promises);
      questions.forEach((q) => {
        if (!newExplanations[q.id]) {
          newExplanations[q.id] = { hint1: "", hint2: "", explanation: "해설을 불러오는데 실패했습니다." };
        }
      });
      setAiExplanations(newExplanations);
    } catch (e) {
      console.error("Failed to fetch AI explanations for quiz:", e);
      toast.error("AI 해설을 불러오는데 실패했습니다.");
      const fallbackExplanations: Record<string, AiExplanation> = {};
      questions.forEach((q) => {
        fallbackExplanations[q.id] = { hint1: "", hint2: "", explanation: "해설을 불러오는데 실패했습니다." };
      });
      setAiExplanations(fallbackExplanations);
    } finally {
      setLoadingExplanations(false);
    }
  }, [questions, pack.roles]);

  useEffect(() => {
    if (!isSubmitted || loadingExplanations || Object.keys(aiExplanations).length > 0) return;

    void fetchAllExplanations(submittedAnswers ?? answers);
  }, [isSubmitted, loadingExplanations, aiExplanations, fetchAllExplanations, submittedAnswers, answers]);

  useEffect(() => {
    if (justSubmitted) setScoreModalOpen(true);
  }, [justSubmitted]);

  const handleSubmit = async () => {
    setMessage(null);
    setBusy(true);
    try {
      await onSubmit(answers);
      setIsSubmittedLocal(true);
      setJustSubmitted(true);
      onUpdate?.();
      void fetchAllExplanations(answers);
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : PLAYER_MESSAGES.operationFailed;
      setMessage(errMsg);
      toast.error(errMsg);
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
              {!allExplanationsLoaded ? (
                <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
                  <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
                  <p className="text-sm font-semibold text-[var(--muted-foreground)]">결과 불러오는 중...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <QuizSubmitSummary
                    snapshot={scoreSnapshot}
                    onOpenBaseScoreGuide={() => setBaseScoreGuideOpen(true)}
                    onOpenTestScoreGuide={() => setTestScoreGuideOpen(true)}
                    onOpenStadGuide={() => setStadGuideOpen(true)}
                  />

                  <div className="border-t border-[var(--border)] pt-4 space-y-6">
                    <h3 className="text-sm font-semibold mb-3">실전 문제 해설</h3>
                    {questions.map((q, idx) => {
                      const aiResult = aiExplanations[q.id];
                      const chosenAnswer = (submittedAnswers ?? answers).find((a) => a.questionId === q.id);
                      const chosenIndex = chosenAnswer?.choiceIndex;
                      const isCorrect = chosenIndex === q.correctIndex;

                      return (
                        <div key={q.id} className="space-y-2 border-b border-[var(--border)] pb-4 last:border-b-0">
                          <div className="flex flex-col items-start gap-2">
                            <span className={cn(
                              "inline-flex items-center px-1.5 py-0.5 rounded text-[14px] font-bold border shrink-0 mt-0.5",
                              isCorrect
                                ? "bg-[var(--tint-primary-weak)] text-[var(--primary)] border-[var(--primary)]/20"
                                : "bg-[var(--danger)]/10 text-[var(--danger)] border-[var(--danger)]/20"
                            )}>
                              {isCorrect ? "정답" : "오답"}
                            </span>
                            <p className="font-medium text-xs break-keep break-words">
                              {questions.length > 1 ? `${idx + 1}. ` : ""}{q.prompt}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 text-[15px] font-medium">
                            <span className="text-[var(--primary)]">정답: {q.choices[q.correctIndex]}</span>
                            {chosenIndex !== undefined && !isCorrect && (
                              <span className="text-[var(--danger)]">
                                내가 고른 답: {q.choices[chosenIndex]}
                              </span>
                            )}
                          </div>
                          {aiResult?.explanation && (
                            <div className="mt-2 space-y-2">
                              <PlayQuestionExplanation className="border-[var(--primary)]/30 bg-[var(--tint-primary-weak)]">
                                <span className="font-semibold text-[var(--primary)] flex items-center gap-1.5 mb-1 text-xs">
                                  <Sparkles className="h-3.5 w-3.5" />
                                  AI 상세 해설
                                </span>
                                <span className="block text-[var(--foreground)] whitespace-pre-wrap break-keep break-words">{aiResult.explanation}</span>
                              </PlayQuestionExplanation>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
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
        <div className="grid items-start gap-4 lg:grid-cols-2">
          {/* Left Column: Combined passages */}
          <div>
            <PlayPhaseSection title="학습 내용" variant="active" className="min-h-0">
              <div className="space-y-6 rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-4 @md:p-5">
                {testSections.map((section, sectionIndex) => {
                  const sectionLabel = codenameForRole(roleScopeKey, section.roleId, roleIds);
                  return (
                    <div key={section.roleId} className={cn(sectionIndex > 0 && "border-t border-[var(--border)] pt-6")}>
                      <h4 className="text-sm font-semibold mb-2 text-[var(--primary)]">{sectionLabel}</h4>
                      <p className="whitespace-pre-wrap break-keep break-words text-sm text-[var(--foreground)]">{section.segment}</p>
                    </div>
                  );
                })}
              </div>
            </PlayPhaseSection>
          </div>

          {/* Right Column: Quiz questions */}
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
                    결과 보기
                  </Button>
                ) : null}
                <PlayPhaseSectionBadge>
                  {isSubmitted
                    ? `정답 ${grade.correctCount}/${questions.length}`
                    : `${answeredCount}/${questions.length} 문항`}
                </PlayPhaseSectionBadge>
              </div>
            }
          >
            <div className="space-y-5">
              <QuizQuestionList
                questions={questions}
                selected={selected}
                onSelect={(qid, ci) => setSelected((prev) => ({ ...prev, [qid]: ci }))}
                disabled={busy || isSubmitted}
                reveal={isSubmitted}
                startIndex={0}
              />
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
                        <Loader2 className="mr-2 h-4 w-4 animate-spin text-current" aria-hidden />
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
        </div>

        {message ? <PlayPhaseMessage message={message} /> : null}
      </PlayPhasePanel>
    </PlayPhaseShell>
  );
}
