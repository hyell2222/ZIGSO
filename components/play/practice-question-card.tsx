"use client";

import { CheckCircle2, XCircle } from "lucide-react";
import { useState } from "react";

import { activityLayoutType } from "@/components/activity/activity-layout-typography";
import {
  PlayQuestionExplanation,
  PlayQuestionHelperText,
  PlayQuestionHints,
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
};

type Props = {
  question: QuizQuestion;
  /** 연습 종료(정답 또는 3회 오답) 시 1회 호출 */
  onComplete: (result: PracticeResult) => void | Promise<void>;
  /** 이미 완료된 경우(복귀 등) 표시용 */
  initialResult?: {
    wrongAttempts: number;
    baseScore: number;
    choiceIndex?: number;
    wrongChoiceIndices?: number[];
  } | null;
  disabled?: boolean;
  /** false면 점수·감점 없이 탐색용 (서로 알려주기 모둠원 파트) */
  scored?: boolean;
};

function initialWrongChoices(initialResult: Props["initialResult"]): number[] {
  if (!initialResult?.wrongChoiceIndices?.length) return [];
  return initialResult.wrongChoiceIndices;
}

export function PracticeQuestionCard({
  question,
  onComplete,
  initialResult,
  disabled,
  scored = true,
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

  const outOfAttempts = wrongAttempts >= PRACTICE_MAX_ATTEMPTS;
  const currentScore = practiceBaseScore(wrongAttempts);
  const hints = question.hints ?? [];
  const shownHints = hints.slice(0, Math.min(wrongAttempts, hints.length));
  const showOutcome = done || (revealed && !correct && outOfAttempts);

  const finish = async (result: PracticeResult) => {
    setBusy(true);
    try {
      await onComplete(result);
      setDone(true);
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = async () => {
    if (selected === null || done || busy) return;
    if (selected === question.correctIndex) {
      setRevealed(true);
      setCorrect(true);
      await finish({
        wrongAttempts,
        baseScore: practiceBaseScore(wrongAttempts),
        correct: true,
        answer: { questionId: question.id, choiceIndex: selected },
      });
      return;
    }
    const nextWrong = wrongAttempts + 1;
    const nextWrongChoices = [...wrongChoices, selected];
    setWrongAttempts(nextWrong);
    setWrongChoices(nextWrongChoices);
    if (nextWrong >= PRACTICE_MAX_ATTEMPTS) {
      setRevealed(true);
      setCorrect(false);
      await finish({
        wrongAttempts: PRACTICE_MAX_ATTEMPTS,
        baseScore: practiceBaseScore(PRACTICE_MAX_ATTEMPTS),
        correct: false,
        answer: {
          questionId: question.id,
          choiceIndex: selected,
        },
      });
    } else {
      setSelected(null);
    }
  };

  const lockAll = done || revealed || busy || disabled;

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-4 @md:p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className={cn("font-medium", t.playPanelBody)}>{question.prompt}</p>
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

      {shownHints.length > 0 && !correct ? <PlayQuestionHints hints={shownHints} /> : null}

      {!showOutcome ? (
        <div className="mt-4 flex items-center justify-between gap-3">
          <PlayQuestionHelperText>
            {wrongAttempts > 0 && !outOfAttempts
              ? scored
                ? `오답이에요. 힌트를 참고해 다시 풀어 보세요. (현재 ${currentScore}점)`
                : "오답이에요. 힌트를 참고해 다시 풀어 보세요."
              : scored
                ? "정답을 골라 제출하세요. 오답마다 점수가 깎여요."
                : "정답을 골라 제출하세요. 점수에는 영향 없어요."}
          </PlayQuestionHelperText>
          {outOfAttempts ? null : (
            <Button
              type="button"
              className="shrink-0 gap-2 min-h-10 touch-manipulation @md:min-h-11"
              onClick={() => void handleSubmit()}
              disabled={selected === null || busy}
            >
              제출
            </Button>
          )}
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          <p className="text-sm">해설</p>
          {question.explanation ? (
            <PlayQuestionExplanation>{question.explanation}</PlayQuestionExplanation>
          ) : null}
        </div>
      )}
    </div>
  );
}
