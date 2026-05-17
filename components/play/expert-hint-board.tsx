"use client";

import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import { hintTextForLevel } from "@/lib/activity-pack/engine";
import type { Item } from "@/lib/activity-pack/types";
import { scoreForHintLevel } from "@/lib/activity-pack/scoring";
import { cn } from "@/lib/utils";

const HINT_STAGES = [1, 2, 3, 4, 5] as const;

export type HintRevealState = Record<(typeof HINT_STAGES)[number], boolean>;

export function createHintRevealState(): HintRevealState {
  return { 1: false, 2: false, 3: false, 4: false, 5: false };
}

export function hintLevelUsedFromReveal(_item: Item, reveal: HintRevealState): 1 | 2 | 3 | 4 | 5 {
  let used: 1 | 2 | 3 | 4 | 5 = 1;
  for (const stage of HINT_STAGES) {
    if (reveal[stage]) used = stage;
  }
  return used;
}

type Props = {
  item: Item;
  reveal: HintRevealState;
  onRevealChange: (next: HintRevealState) => void;
};

export function ExpertHintBoard({ item, reveal, onRevealChange }: Props) {
  const stages = useMemo(
    () =>
      HINT_STAGES.map((stage) => ({
        stage,
        text: hintTextForLevel(item, stage),
        open: reveal[stage],
        points: scoreForHintLevel(stage),
      })),
    [item, reveal],
  );

  const hintLevelUsed = hintLevelUsedFromReveal(item, reveal);

  return (
    <div className="space-y-3">
      <p className="text-xs text-[var(--muted-foreground)] @md:text-sm">
        힌트 1~5를 각각 확인할 수 있어요. 정답 제출 시{" "}
        <span className="font-semibold text-[var(--accent)]">{scoreForHintLevel(hintLevelUsed)}점</span>
        (가장 많이 연 힌트 기준)
      </p>
      <ul className="space-y-2.5">
        {stages.map(({ stage, text, open, points }) => (
          <li
            key={stage}
            className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3 @md:p-3.5"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold text-[var(--accent)] @md:text-sm">
                힌트 {stage} · {points}점
              </span>
              {!open ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => onRevealChange({ ...reveal, [stage]: true })}
                >
                  확인하기
                </Button>
              ) : null}
            </div>
            <p
              className={cn(
                "mt-2 text-sm leading-relaxed @md:text-base",
                open ? "text-[var(--foreground)]" : "text-[var(--muted-foreground)]",
              )}
            >
              {open ? text : "아직 확인하지 않았습니다."}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
