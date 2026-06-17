"use client";

import { activityLayoutType } from "@/components/activity/activity-layout-typography";
import { playPreservedTextClass } from "@/components/play/play-question-support";
import { CHOICE_LABELS } from "@/lib/activity-pack/validate";
import type { QuizQuestion } from "@/lib/activity-pack/types";
import { cn } from "@/lib/utils";

const t = activityLayoutType;

type Props = {
  questions: QuizQuestion[];
  /** questionId → 선택한 보기 인덱스 */
  selected: Record<string, number>;
  onSelect?: (questionId: string, choiceIndex: number) => void;
  disabled?: boolean;
  /** 정답/오답 표시 (결과·복기용) */
  reveal?: boolean;
  /** 문항 번호 시작값 (역할별 묶음일 때 이어서 번호 매기기) */
  startIndex?: number;
};

export function QuizQuestionList({
  questions,
  selected,
  onSelect,
  disabled,
  reveal,
  startIndex = 0,
}: Props) {
  return (
    <ol className="space-y-4">
      {questions.map((q, qi) => {
        const chosen = selected[q.id];
        return (
          <li
            key={q.id}
            className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-4 @md:p-5"
          >
            <p className={cn("mb-3 font-medium", playPreservedTextClass)}>
              <span className="mr-1.5 text-[var(--muted-foreground)]">{startIndex + qi + 1}.</span>
              {q.prompt}
            </p>
            <div className="space-y-2">
              {q.choices.map((choice, ci) => {
                const isChosen = chosen === ci;
                const isCorrect = q.correctIndex === ci;
                const showCorrect = reveal && isCorrect;
                const showWrong = reveal && isChosen && !isCorrect;
                return (
                  <button
                    key={ci}
                    type="button"
                    disabled={disabled || reveal}
                    aria-pressed={isChosen}
                    onClick={() => onSelect?.(q.id, ci)}
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
                      (disabled || reveal) && "cursor-default",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                        isChosen || showCorrect
                          ? "border-current"
                          : "border-[var(--border)] text-[var(--muted-foreground)]",
                      )}
                    >
                      {CHOICE_LABELS[ci] ?? ci + 1}
                    </span>
                    <span className="flex-1">{choice}</span>
                    {showCorrect ? <span aria-hidden>✓</span> : null}
                    {showWrong ? <span aria-hidden>✕</span> : null}
                  </button>
                );
              })}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** 응답 배열 → questionId별 선택 인덱스 맵 */
export function answersToSelected(
  answers: { questionId: string; choiceIndex: number }[],
): Record<string, number> {
  const map: Record<string, number> = {};
  for (const a of answers) map[a.questionId] = a.choiceIndex;
  return map;
}

/** 선택 맵 → 응답 배열 (해당 문항만) */
export function selectedToAnswers(
  questions: QuizQuestion[],
  selected: Record<string, number>,
): { questionId: string; choiceIndex: number }[] {
  return questions
    .filter((q) => selected[q.id] !== undefined)
    .map((q) => ({ questionId: q.id, choiceIndex: selected[q.id]! }));
}
