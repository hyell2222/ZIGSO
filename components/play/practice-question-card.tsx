"use client";

import { CheckCircle2, Loader2, Sparkles, XCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { activityLayoutType } from "@/components/activity/activity-layout-typography";
import {
  PlayQuestionExplanation,
  PlayQuestionHelperText,
  playPreservedTextClass,
} from "@/components/play/play-question-support";
import { Button } from "@/components/ui/button";
import {
  PRACTICE_MAX_ATTEMPTS,
  practiceBaseScore,
} from "@/lib/activity-pack/scoring";
import { CHOICE_LABELS } from "@/lib/activity-pack/validate";
import type { QuizAnswer, QuizQuestion } from "@/lib/activity-pack/types";
import { cn } from "@/lib/utils";

const t = activityLayoutType;

export type PracticeResult = {
  wrongAttempts: number;
  baseScore: number;
  correct: boolean;
  answer: QuizAnswer;
  wrongChoices?: number[];
  viewedHint1?: boolean;
  viewedHint2?: boolean;
};

type Props = {
  question: QuizQuestion;
  index: number;
  /** 연습 종료(정답 또는 3회 오답) 시 1회 호출 */
  onComplete: (result: PracticeResult) => void | Promise<void>;
  /** 이미 완료된 경우(복귀 등) 표시용 */
  initialResult?: {
    wrongAttempts: number;
    baseScore: number;
    choiceIndex?: number;
    wrongChoiceIndices?: number[];
    viewedHint1?: boolean;
    viewedHint2?: boolean;
  } | null;
  disabled?: boolean;
  /** false면 점수·감점 없이 탐색용 (서로 알려주기 모둠원 파트) */
  scored?: boolean;
  segment?: string;
  onAiExplanationLoaded?: (
    questionId: string,
    aiResult: { hint1: string; hint2: string; explanation: string }
  ) => void;
  hideHelperText?: boolean;
};

function initialWrongChoices(initialResult: Props["initialResult"]): number[] {
  if (!initialResult?.wrongChoiceIndices?.length) return [];
  return initialResult.wrongChoiceIndices;
}

export function PracticeQuestionCard({
  question,
  index,
  onComplete,
  initialResult,
  disabled,
  scored = true,
  segment,
  onAiExplanationLoaded,
  hideHelperText = false,
}: Props) {
  const [selected, setSelected] = useState<number | null>(null);
  const [wrongChoices, setWrongChoices] = useState<number[]>(() =>
    initialWrongChoices(initialResult),
  );
  const [wrongAttempts, setWrongAttempts] = useState(initialResult?.wrongAttempts ?? 0);
  const [revealed, setRevealed] = useState(Boolean(initialResult));
  const [correct, setCorrect] = useState(
    initialResult ? initialResult.wrongAttempts < PRACTICE_MAX_ATTEMPTS : false,
  );
  const [done, setDone] = useState(Boolean(initialResult));
  const [busy, setBusy] = useState(false);

  const [loadingAi, setLoadingAi] = useState(false);
  const [aiResult, setAiResult] = useState<{
    hint1: string;
    hint2: string;
    explanation: string;
  } | null>(null);
  const [fetchedAtState, setFetchedAtState] = useState<"none" | "hint1" | "hint2" | "completed">("none");
  const [viewedHint1, setViewedHint1] = useState(() => initialResult?.viewedHint1 ?? false);
  const [viewedHint2, setViewedHint2] = useState(() => initialResult?.viewedHint2 ?? false);

  const requestAiHelp = useCallback(async (
    targetState: "hint1" | "hint2" | "completed",
    currentWrongChoices: number[]
  ) => {
    if (!segment) {
      if (targetState === "completed" && onAiExplanationLoaded) {
        onAiExplanationLoaded(question.id, { hint1: "", hint2: "", explanation: "지문을 찾을 수 없어 해설을 생성할 수 없습니다." });
      }
      return;
    }
    setLoadingAi(true);
    try {
      const res = await fetch("/api/ai/explain/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          passage: segment,
          question: question.prompt,
          choices: question.choices,
          correctIndex: question.correctIndex,
          wrongChoices: currentWrongChoices,
        }),
      });
      if (!res.ok) {
        throw new Error("AI 해설을 가져오는데 실패했습니다.");
      }
      const data = await res.json();
      setAiResult(data);
      setFetchedAtState(targetState);
      if (targetState === "completed" && onAiExplanationLoaded) {
        onAiExplanationLoaded(question.id, data);
      }
      return data;
    } catch (e) {
      console.error(e);
      if (targetState === "completed" && onAiExplanationLoaded) {
        const fallback = { hint1: "", hint2: "", explanation: "해설을 불러오는데 실패했습니다." };
        setAiResult(fallback);
        setFetchedAtState("completed");
        onAiExplanationLoaded(question.id, fallback);
      }
      throw e;
    } finally {
      setLoadingAi(false);
    }
  }, [segment, question, onAiExplanationLoaded]);

  const handleRequestAiHelp = useCallback(async (targetState: "hint1" | "hint2" | "completed") => {
    if (loadingAi || busy) return;
    if (targetState === "hint1") {
      setViewedHint1(true);
    } else if (targetState === "hint2") {
      setViewedHint2(true);
    }
    await requestAiHelp(targetState, wrongChoices);
  }, [loadingAi, busy, requestAiHelp, wrongChoices]);

  const outOfAttempts = wrongAttempts >= PRACTICE_MAX_ATTEMPTS;
  const currentScore = practiceBaseScore(wrongAttempts);
  const showOutcome = done || revealed;

  useEffect(() => {
    if (showOutcome && fetchedAtState !== "completed" && !loadingAi && segment) {
      void handleRequestAiHelp("completed");
    }
  }, [showOutcome, fetchedAtState, loadingAi, segment, handleRequestAiHelp]);

  const finish = useCallback(async (result: PracticeResult) => {
    setBusy(true);
    try {
      await onComplete(result);
      setDone(true);
    } finally {
      setBusy(false);
    }
  }, [onComplete]);

  useEffect(() => {
    if (revealed && !done && busy) {
      const loadAndFinish = async () => {
        const targetWrongChoices = correct ? wrongChoices : [...wrongChoices, selected!];
        
        // Trigger completion synchronously to open score modal immediately
        void finish({
          wrongAttempts: correct ? wrongAttempts : PRACTICE_MAX_ATTEMPTS,
          baseScore: practiceBaseScore(correct ? wrongAttempts : PRACTICE_MAX_ATTEMPTS),
          correct,
          answer: { questionId: question.id, choiceIndex: selected ?? question.correctIndex },
          wrongChoices: targetWrongChoices,
          viewedHint1,
          viewedHint2,
        });

        // Fetch AI explanation in parallel
        if (!aiResult) {
          try {
            await requestAiHelp("completed", targetWrongChoices);
          } catch (e) {
            console.error(e);
          }
        } else {
          setFetchedAtState("completed");
          if (onAiExplanationLoaded) {
            onAiExplanationLoaded(question.id, aiResult);
          }
        }
      };
      void loadAndFinish();
    }
  }, [revealed, done, busy, aiResult, wrongChoices, wrongAttempts, correct, selected, question, onAiExplanationLoaded, finish, requestAiHelp, viewedHint1, viewedHint2]);

  const handleSubmit = async () => {
    if (selected === null || done || busy || loadingAi) return;

    setBusy(true);
    if (selected === question.correctIndex) {
      setRevealed(true);
      setCorrect(true);
      return;
    }

    const nextWrong = wrongAttempts + 1;
    const nextWrongChoices = [...wrongChoices, selected];
    setWrongAttempts(nextWrong);
    setWrongChoices(nextWrongChoices);

    if (nextWrong >= PRACTICE_MAX_ATTEMPTS) {
      setRevealed(true);
      setCorrect(false);
      return;
    }

    setSelected(null);
    setBusy(false);
  };

  const lockAll = done || revealed || busy || disabled || loadingAi;

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-4 @md:p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className={cn("font-medium", playPreservedTextClass)}>
          {index + 1}. {question.prompt}
        </p>
      </div>

      <div className="space-y-2">
        {question.choices.map((choice, ci) => {
          const isWrongChoice = wrongChoices.includes(ci);
          const isChosen = !lockAll && selected === ci;
          const isCorrectChoice = question.correctIndex === ci;
          const showCorrect = revealed && isCorrectChoice;
          const showWrong = isWrongChoice && !isCorrectChoice;
          const choiceDisabled = lockAll || isWrongChoice;
          return (
            <button
              key={ci}
              type="button"
              disabled={choiceDisabled}
              aria-pressed={isChosen || showWrong}
              onClick={() => setSelected(ci)}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition",
                t.playPanelBody,
                showCorrect
                  ? "border-[var(--primary)] bg-[var(--tint-accent-weak)] text-[var(--primary)]"
                  : showWrong
                    ? "border-[var(--danger)] bg-[var(--danger)]/10 text-[var(--danger)]"
                    : isChosen
                      ? "border-[var(--primary)] bg-[var(--tint-accent-strong)] text-[var(--primary)] ring-2 ring-[var(--primary)]/30"
                      : "border-[var(--border)] bg-[var(--background)] hover:border-[var(--accent)]",
                choiceDisabled &&
                  !showCorrect &&
                  !showWrong &&
                  "cursor-default opacity-90",
                isWrongChoice && !lockAll && "cursor-not-allowed",
              )}
            >
              <span
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                  isChosen || showCorrect || showWrong
                    ? "border-current"
                    : "border-[var(--border)] text-[var(--muted-foreground)]",
                )}
              >
                {CHOICE_LABELS[ci] ?? ci + 1}
              </span>
              <span className="flex-1">{choice}</span>
              {showCorrect ? <CheckCircle2 className="h-4 w-4" aria-hidden /> : null}
              {showWrong ? <XCircle className="h-4 w-4" aria-hidden /> : null}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        {!hideHelperText ? (
          <PlayQuestionHelperText>
            {showOutcome
              ? correct
                ? scored
                  ? `정답이에요! (획득 점수: ${currentScore}점)`
                  : "정답이에요!"
                : scored
                  ? `오답이에요. 시도 가능 횟수가 모두 초과되었어요. (획득 점수: ${currentScore}점)`
                  : "오답이에요. 시도 가능 횟수가 모두 초과되었어요."
              : wrongAttempts > 0 && !outOfAttempts
                ? scored
                  ? `오답이에요. 힌트를 참고해 다시 풀어 보세요. (현재 ${currentScore}점)`
                  : "오답이에요. 힌트를 참고해 다시 풀어 보세요."
                : scored
                  ? "정답을 골라 제출하세요. 오답마다 점수가 깎여요."
                  : "정답을 골라 제출하세요. 점수에는 영향 없어요."}
          </PlayQuestionHelperText>
        ) : (
          <div />
        )}
        {!showOutcome && (
          <Button
            type="button"
            className="shrink-0 gap-2 min-h-10 touch-manipulation @md:min-h-11"
            onClick={() => void handleSubmit()}
            disabled={selected === null || busy || loadingAi}
          >
            {busy ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin text-current" aria-hidden />
                {loadingAi ? "해설 생성 중…" : "제출 중…"}
              </>
            ) : (
              "제출"
            )}
          </Button>
        )}
      </div>

      {segment && !showOutcome && ((wrongAttempts === 1 || wrongAttempts === 2) || aiResult) && (
        <div className="mt-4 space-y-3 border-t border-[var(--border)] pt-4">
          <div>
            {wrongAttempts >= 1 && !viewedHint1 && !viewedHint2 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleRequestAiHelp(wrongAttempts === 1 ? "hint1" : "hint2")}
                disabled={loadingAi}
                className="w-full gap-1.5 text-xs border-[var(--primary)]/40 text-[var(--primary)] hover:bg-[var(--tint-primary-weak)]"
              >
                {loadingAi ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    AI 힌트 분석 중...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    AI 힌트 보기
                  </>
                )}
              </Button>
            )}

            {wrongAttempts === 2 && viewedHint1 && !viewedHint2 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setViewedHint2(true)}
                disabled={loadingAi}
                className="w-full gap-1.5 text-xs border-[var(--primary)]/40 text-[var(--primary)] hover:bg-[var(--tint-primary-weak)]"
              >
                <Sparkles className="h-3.5 w-3.5" />
                AI 상세 힌트 보기
              </Button>
            )}
          </div>

          {aiResult && !correct && (
            <div className="space-y-2">
              {aiResult.hint1 && viewedHint1 && (
                <PlayQuestionExplanation className="border-[var(--primary)]/30 bg-[var(--tint-primary-weak)]">
                  <span className="font-semibold text-[var(--primary)] flex items-center gap-1.5 mb-1 text-xs">
                    <Sparkles className="h-3.5 w-3.5" />
                    AI 힌트
                  </span>
                  <span className="block text-[var(--foreground)]">{aiResult.hint1}</span>
                </PlayQuestionExplanation>
              )}
              {aiResult.hint2 && viewedHint2 && (
                <PlayQuestionExplanation className="border-[var(--primary)]/30 bg-[var(--tint-primary-weak)]">
                  <span className="font-semibold text-[var(--primary)] flex items-center gap-1.5 mb-1 text-xs">
                    <Sparkles className="h-3.5 w-3.5" />
                    AI 상세 힌트
                  </span>
                  <span className="block text-[var(--foreground)]">{aiResult.hint2}</span>
                </PlayQuestionExplanation>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
