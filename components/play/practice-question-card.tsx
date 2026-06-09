"use client";

import { CheckCircle2, Lightbulb, XCircle } from "lucide-react";
import { useState } from "react";

import { activityLayoutType } from "@/components/activity/activity-layout-typography";
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
  /** 연습 종료(정답 또는 정답 확인) 시 1회 호출 */
  onComplete: (result: PracticeResult) => void | Promise<void>;
  /** 이미 완료된 경우(복귀 등) 표시용 */
  initialResult?: { wrongAttempts: number; baseScore: number } | null;
  disabled?: boolean;
};

export function PracticeQuestionCard({ question, onComplete, initialResult, disabled }: Props) {
  const [selected, setSelected] = useState<number | null>(null);
  const [wrongAttempts, setWrongAttempts] = useState(initialResult?.wrongAttempts ?? 0);
  const [revealed, setRevealed] = useState(Boolean(initialResult));
  const [correct, setCorrect] = useState(
    initialResult ? initialResult.wrongAttempts < PRACTICE_MAX_ATTEMPTS : false,
  );
  const [done, setDone] = useState(Boolean(initialResult));
  const [busy, setBusy] = useState(false);
  const [lastWrong, setLastWrong] = useState<number | null>(null);

  const attemptsLeft = PRACTICE_MAX_ATTEMPTS - wrongAttempts;
  const outOfAttempts = wrongAttempts >= PRACTICE_MAX_ATTEMPTS;
  const currentScore = practiceBaseScore(wrongAttempts);
  const hints = question.hints ?? [];
  const shownHints = hints.slice(0, Math.min(wrongAttempts, hints.length));

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
      setCorrect(true);
      setRevealed(true);
      setLastWrong(null);
      await finish({
        wrongAttempts,
        baseScore: practiceBaseScore(wrongAttempts),
        correct: true,
        answer: { questionId: question.id, choiceIndex: selected },
      });
      return;
    }
    const nextWrong = wrongAttempts + 1;
    setWrongAttempts(nextWrong);
    setLastWrong(selected);
    if (nextWrong >= PRACTICE_MAX_ATTEMPTS) {
      // 3번째도 오답 — 정답 확인 단계로
      setSelected(null);
    } else {
      setSelected(null);
    }
  };

  const handleReveal = async () => {
    setRevealed(true);
    await finish({
      wrongAttempts: PRACTICE_MAX_ATTEMPTS,
      baseScore: practiceBaseScore(PRACTICE_MAX_ATTEMPTS),
      correct: false,
      answer: { questionId: question.id, choiceIndex: lastWrong ?? -1 },
    });
  };

  const lockChoices = done || revealed || busy || disabled;

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-4 @md:p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className={cn("font-medium", t.playPanelBody)}>{question.prompt}</p>
        <span className="shrink-0 rounded-full bg-[var(--tint-accent-weak)] px-2.5 py-1 font-mono text-xs font-semibold tabular-nums text-[var(--primary)]">
          {done ? `이 문항 ${currentScore}점` : `남은 기회 ${attemptsLeft}`}
        </span>
      </div>

      <div className="space-y-2">
        {question.choices.map((choice, ci) => {
          const isChosen = selected === ci;
          const isCorrectChoice = question.correctIndex === ci;
          const showCorrect = revealed && isCorrectChoice;
          const showWrong = revealed && !correct && lastWrong === ci && !isCorrectChoice;
          return (
            <button
              key={ci}
              type="button"
              disabled={lockChoices}
              aria-pressed={isChosen}
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
                lockChoices && !showCorrect && !showWrong && "cursor-default opacity-90",
              )}
            >
              <span
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                  isChosen || showCorrect ? "border-current" : "border-[var(--border)] text-[var(--muted-foreground)]",
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

      {shownHints.length > 0 && !correct ? (
        <ul className="mt-3 space-y-2">
          {shownHints.map((hint, i) => (
            <li
              key={i}
              className={cn(
                "flex gap-2 rounded-lg border border-[var(--accent)]/40 bg-[var(--tint-accent-weak)] px-3 py-2",
                t.playPanelBody,
              )}
            >
              <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)]" aria-hidden />
              <span>{hint}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {!done ? (
        <div className="mt-4 flex items-center justify-between gap-3">
          <p className={cn(t.caption)}>
            {wrongAttempts > 0 && !outOfAttempts
              ? `오답이에요. 힌트를 참고해 다시 풀어 보세요. (현재 ${currentScore}점)`
              : "정답을 골라 제출하세요. 오답마다 점수가 깎여요."}
          </p>
          {outOfAttempts ? (
            <Button type="button" variant="secondary" onClick={() => void handleReveal()} disabled={busy}>
              정답 확인
            </Button>
          ) : (
            <Button type="button" onClick={() => void handleSubmit()} disabled={selected === null || busy}>
              제출
            </Button>
          )}
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          <p
            className={cn(
              "font-semibold",
              correct ? "text-[var(--primary)]" : "text-[var(--danger)]",
              t.playPanelBody,
            )}
          >
            {correct ? `정답! 이 문항 ${currentScore}점` : `정답 확인 · 이 문항 ${currentScore}점`}
          </p>
          {question.explanation ? (
            <p className={cn("rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2", t.caption)}>
              {question.explanation}
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
