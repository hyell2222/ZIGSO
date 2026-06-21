"use client";

import { useMemo, useState } from "react";

import { PlayPhaseShell } from "@/components/play/play-phase-shell";
import { PlayStudentTopBanner } from "@/components/play/play-student-top-banner";
import {
  PhaseSectionPanel as PlayPhasePanel,
  PhaseSection as PlayPhaseSection,
  PhaseSectionBadge as PlayPhaseSectionBadge,
  PhaseSectionMessage as PlayPhaseMessage,
} from "@/components/activity/phase-section-layout";
import { BaseScoreGuideModal } from "@/components/play/base-score-guide-modal";
import { ScoreGuideHelpButton } from "@/components/play/score-guide-help-button";
import { ScoreTile } from "@/components/play/score-tile";

type PracticeCompleteSummaryProps = {
  baseScore: number;
  onOpenBaseScoreGuide: () => void;
};

function PracticeCompleteSummary({ baseScore, onOpenBaseScoreGuide }: PracticeCompleteSummaryProps) {
  return (
    <ScoreTile
      label="기준 점수"
      value={`${baseScore}점`}
      highlight
      labelExtra={
        <ScoreGuideHelpButton ariaLabel="기준 점수 안내" onClick={onOpenBaseScoreGuide} />
      }
    />
  );
}
import { GuideInfoModal } from "@/components/play/guide-info-modal";
import {
  PracticeQuestionCard,
  type PracticeResult,
} from "@/components/play/practice-question-card";
import { PlaySegmentText, PlayQuestionExplanation } from "@/components/play/play-question-support";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles } from "lucide-react";
import {
  computeBaseScoreFromPracticeResults,
  getPracticeQuestions,
  getRoleById,
  PLAYER_MESSAGES,
  toPracticeQuestionResult,
} from "@/lib/activity-pack/engine";
import { practiceBaseScore as practiceQuestionScore } from "@/lib/activity-pack/scoring";
import { codenameForRole } from "@/lib/play/role-codenames";
import type { ActivityPack, PracticeQuestionResult } from "@/lib/activity-pack/types";
import { cn } from "@/lib/utils";

type Props = {
  pack: ActivityPack;
  roleId: string | null;
  groupName: string | null;
  roleScopeKey: string;
  onSubmitPractice: (results: PracticeQuestionResult[], baseScore: number) => void | Promise<void>;
  practiceSubmitted?: boolean;
  practiceResults?: PracticeQuestionResult[];
  practiceBaseScore?: number | null;
  pending?: boolean;
};

const scoreModalTitleId = "expert-practice-score-modal";

export function ExpertPhasePanel({
  pack,
  roleId,
  groupName,
  roleScopeKey,
  onSubmitPractice,
  practiceSubmitted = false,
  practiceResults: savedResults = [],
  practiceBaseScore,
  pending,
}: Props) {
  const [completed, setCompleted] = useState<Record<string, PracticeQuestionResult>>(() => {
    const map: Record<string, PracticeQuestionResult> = {};
    for (const r of savedResults) map[r.questionId] = r;
    return map;
  });
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [scoreModalOpen, setScoreModalOpen] = useState(false);
  const [baseScoreGuideOpen, setBaseScoreGuideOpen] = useState(false);
  const [aiExplanations, setAiExplanations] = useState<Record<string, { hint1: string; hint2: string; explanation: string }>>({});

  const role = roleId ? getRoleById(pack, roleId) : undefined;
  const practiceQuestions = useMemo(
    () => (roleId ? getPracticeQuestions(pack, roleId) : []),
    [pack, roleId],
  );

  const roleLabel = useMemo(() => {
    if (!roleId) return "역할";
    return codenameForRole(roleScopeKey, roleId, pack.roles.map((r) => r.id));
  }, [roleId, roleScopeKey, pack.roles]);

  const doneCount = practiceQuestions.filter((q) => completed[q.id]).length;
  const allDone = practiceQuestions.length > 0 && doneCount >= practiceQuestions.length;
  const done = allDone || practiceSubmitted;

  const baseScore = useMemo(() => {
    if (practiceSubmitted && practiceBaseScore != null) return practiceBaseScore;
    const results = practiceQuestions.map((q) => completed[q.id]).filter(Boolean);
    if (results.length !== practiceQuestions.length) return null;
    return computeBaseScoreFromPracticeResults(results);
  }, [practiceSubmitted, practiceBaseScore, practiceQuestions, completed]);

  const phaseComplete = done && baseScore != null;

  const allExplanationsLoaded = useMemo(() => {
    return practiceQuestions.every((q) => aiExplanations[q.id]);
  }, [practiceQuestions, aiExplanations]);

  const handleQuestionComplete = async (questionId: string, result: PracticeResult) => {
    const entry = {
      ...toPracticeQuestionResult(questionId, result.wrongAttempts),
      wrongChoices: result.wrongChoices,
    };
    const next = { ...completed, [questionId]: entry };
    setCompleted(next);

    const resultsList = practiceQuestions.map((q) => next[q.id]).filter(Boolean);
    if (resultsList.length < practiceQuestions.length) return;

    setMessage(null);
    setSubmitting(true);
    try {
      const score = computeBaseScoreFromPracticeResults(resultsList);
      await onSubmitPractice(resultsList, score);
      setScoreModalOpen(true);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : PLAYER_MESSAGES.operationFailed);
      throw e;
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PlayPhaseShell
      mainClassName="flex min-h-0 flex-1 flex-col"
      topBanner={
        <PlayStudentTopBanner
          phase="expert_group"
          groupName={groupName}
          placeName={roleLabel}
          placeLabel="역할"
          pending={pending}
        />
      }
      overlay={
        <>
          {phaseComplete && baseScore != null ? (
            <GuideInfoModal
              open={scoreModalOpen}
              onClose={() => setScoreModalOpen(false)}
              title="2단계 완료!"
              titleId={scoreModalTitleId}
            >
              {!allExplanationsLoaded ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)] mb-3" />
                  <p className="text-sm font-semibold text-[var(--muted-foreground)]">결과 불러오는 중...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <PracticeCompleteSummary
                    baseScore={baseScore}
                    onOpenBaseScoreGuide={() => setBaseScoreGuideOpen(true)}
                  />

                  <div className="border-t border-[var(--border)] pt-4 space-y-6">
                    <h3 className="text-sm font-semibold mb-3">연습 문제 해설</h3>
                    {practiceQuestions.map((q, idx) => {
                      const aiResult = aiExplanations[q.id];
                      const result = completed[q.id];
                      const isCorrect = result ? result.wrongAttempts < 3 : false;
                      return (
                        <div key={q.id} className="space-y-2 border-b border-[var(--border)] pb-4 last:border-b-0">
                          <div className="flex flex-col items-start gap-2">
                            <div className="flex items-center gap-2">
                              <span className={cn(
                                "inline-flex items-center px-1.5 py-0.5 rounded text-[14px] font-bold border shrink-0 mt-0.5",
                                isCorrect
                                  ? "bg-[var(--tint-primary-weak)] text-[var(--primary)] border-[var(--primary)]/20"
                                  : "bg-[var(--danger)]/10 text-[var(--danger)] border-[var(--danger)]/20"
                              )}>
                                {isCorrect ? "정답" : "오답"}
                              </span>
                              {result && result.wrongAttempts > 0 && (
                                <span className={cn(
                                  "inline-flex items-center px-1.5 py-0.5 rounded text-[14px] font-bold border shrink-0 mt-0.5",
                                  result.wrongAttempts >= 3
                                    ? "bg-[var(--danger)]/10 text-[var(--danger)] border-[var(--danger)]/20"
                                    : "bg-amber-50 text-amber-600 border-amber-200"
                                )}>
                                  오답 {result.wrongAttempts}회
                                </span>
                              )}
                            </div>
                            <p className="font-medium text-xs">
                              {idx + 1}. {q.prompt}
                            </p>
                          </div>
                          <div className="flex flex-col gap-1">
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 text-[15px] font-medium">
                              <span className="text-[var(--primary)]">정답: {q.choices[q.correctIndex]}</span>
                              {result && result.wrongChoices && result.wrongChoices.length > 0 && (
                                <span className="text-[var(--danger)]">내가 고른 오답: {result.wrongChoices.map((ci) => q.choices[ci] ?? `보기 ${ci + 1}`).join(", ")}</span>
                              )}
                            </div>

                          </div>
                          {aiResult ? (
                            <div className="mt-2 space-y-2">
                              {aiResult.hint1 && result && result.wrongAttempts >= 1 && (
                                <PlayQuestionExplanation className="border-[var(--primary)]/30 bg-[var(--tint-primary-weak)]">
                                  <span className="font-semibold text-[var(--primary)] flex items-center gap-1.5 mb-1 text-xs">
                                    <Sparkles className="h-3.5 w-3.5" />
                                    AI 1차 힌트
                                  </span>
                                  <span className="block text-[var(--foreground)]">{aiResult.hint1}</span>
                                </PlayQuestionExplanation>
                              )}
                              {aiResult.hint2 && result && result.wrongAttempts >= 2 && (
                                <PlayQuestionExplanation className="border-[var(--primary)]/30 bg-[var(--tint-primary-weak)]">
                                  <span className="font-semibold text-[var(--primary)] flex items-center gap-1.5 mb-1 text-xs">
                                    <Sparkles className="h-3.5 w-3.5" />
                                    AI 2차 힌트
                                  </span>
                                  <span className="block text-[var(--foreground)]">{aiResult.hint2}</span>
                                </PlayQuestionExplanation>
                              )}
                              {aiResult.explanation && (
                                <PlayQuestionExplanation className="border-[var(--primary)]/30 bg-[var(--tint-primary-weak)]">
                                  <span className="font-semibold text-[var(--primary)] flex items-center gap-1.5 mb-1 text-xs">
                                    <Sparkles className="h-3.5 w-3.5" />
                                    AI 상세 해설
                                  </span>
                                  <span className="block text-[var(--foreground)] whitespace-pre-wrap">{aiResult.explanation}</span>
                                </PlayQuestionExplanation>
                              )}
                            </div>
                          ) : null}
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
        </>
      }
    >
      <PlayPhasePanel>
        {!role ? (
          <PlayPhaseMessage message={PLAYER_MESSAGES.unknownRole} />
        ) : (
          <>
            <div className="grid items-start gap-4 lg:grid-cols-2">
              <div className="lg:sticky lg:top-4">
                <PlayPhaseSection title="내가 맡은 부분" variant="active" className="min-h-0">
                  <PlaySegmentText>{role.segment}</PlaySegmentText>
                </PlayPhaseSection>
              </div>

              <PlayPhaseSection
                title="연습 문제"
                variant="active"
                className="min-h-0"
                headerExtra={
                  <div className="flex items-center gap-2">
                    {phaseComplete ? (
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
                      {doneCount}/{practiceQuestions.length} 문항
                    </PlayPhaseSectionBadge>
                  </div>
                }
              >
                <div className="space-y-4">
                  {practiceQuestions.map((q, idx) => {
                    const stored = completed[q.id];
                    const initialResult = stored
                      ? {
                        wrongAttempts: stored.wrongAttempts,
                        baseScore: practiceQuestionScore(stored.wrongAttempts),
                        wrongChoiceIndices: stored.wrongChoices,
                      }
                      : null;
                    const locked = practiceSubmitted || Boolean(stored) || submitting;
                    return (
                      <div key={q.id}>
                        <PracticeQuestionCard
                          question={q}
                          index={idx}
                          onComplete={(r) => handleQuestionComplete(q.id, r)}
                          initialResult={initialResult}
                          disabled={locked && !stored}
                          segment={role.segment}
                          onAiExplanationLoaded={(qid, res) => {
                            setAiExplanations((prev) => ({ ...prev, [qid]: res }));
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              </PlayPhaseSection>
            </div>
            {message ? <PlayPhaseMessage message={message} /> : null}
          </>
        )}
      </PlayPhasePanel>
    </PlayPhaseShell>
  );
}
