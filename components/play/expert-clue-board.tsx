"use client";

import { useMemo, useEffect } from "react";
import { Lock, Eye, Lightbulb } from "lucide-react"; 

import { Button } from "@/components/ui/button";
import { clueTextForLevel } from "@/lib/activity-pack/engine";
import type { Item } from "@/lib/activity-pack/types";
import { scoreForClueLevel } from "@/lib/activity-pack/scoring";
import { cn } from "@/lib/utils";

const HINT_STAGES = [1, 2, 3, 4, 5] as const;
type StageType = (typeof HINT_STAGES)[number];

export type ClueRevealState = Record<StageType, boolean>;

export function createClueRevealState(): ClueRevealState {
  return { 1: true, 2: false, 3: false, 4: false, 5: false };
}

export function clueLevelUsedFromReveal(_item: Item, reveal: ClueRevealState): StageType {
  let used: StageType = 1;
  for (const stage of HINT_STAGES) {
    if (reveal[stage]) used = stage;
  }
  return used;
}

type Props = {
  item: Item;
  reveal: ClueRevealState;
  onRevealChange: (next: ClueRevealState) => void;
};

export function ExpertClueBoard({ item, reveal, onRevealChange }: Props) {
  useEffect(() => {
    if (!reveal[1]) {
      onRevealChange({ ...reveal, 1: true });
    }
  }, [reveal, onRevealChange]);

  const clueLevelUsed = useMemo(() => clueLevelUsedFromReveal(item, reveal), [item, reveal]);
  
  const stages = useMemo(
    () =>
      HINT_STAGES.map((stage, index) => {
        const open = stage === 1 ? true : reveal[stage];
        const isLocked = index > 0 && !reveal[HINT_STAGES[index - 1] as StageType] && !open;

        return {
          stage,
          text: clueTextForLevel(item, stage),
          open,
          isLocked,
          points: scoreForClueLevel(stage),
        };
      }),
    [item, reveal],
  );

  const handleReveal = (stage: StageType, points: number) => {
    const message = `다음 단서를 확인하시겠습니까?\n이 단서를 열면 획득 가능한 최대 점수가 ${points}점으로 변경됩니다.`;
    if (window.confirm(message)) {
      onRevealChange({ ...reveal, [stage]: true });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2.5 rounded-xl bg-[var(--accent)]/5 p-3.5 border border-[var(--accent)]/20">
        <Lightbulb className="h-4 w-4 text-[var(--accent)] mt-0.5 flex-shrink-0" />
        <div className="space-y-1">
          <p className="text-xs font-semibold text-[var(--foreground)]">
            적은 단서로 정답을 맞출수록 높은 점수를 얻습니다!
          </p>
          <p className="text-xs text-[var(--muted-foreground)]">
            현재 성공 시 획득 점수:{" "}
            <span className="font-bold text-[var(--accent)] text-sm">
              {scoreForClueLevel(clueLevelUsed)}점
            </span>
          </p>
        </div>
      </div>

      <ul className="space-y-3">
        {stages.map(({ stage, text, open, isLocked, points }) => (
          <li
            key={stage}
            className={cn(
              "relative overflow-hidden rounded-xl border p-4 transition-all duration-200",
              open 
                ? "border-[var(--accent)]/30 bg-[var(--background)] shadow-sm" 
                : isLocked
                ? "border-[var(--border)]/40 bg-[var(--muted)]/10 opacity-60" 
                : "border-[var(--border)] bg-[var(--background)] shadow-sm hover:border-[var(--border)]-hover" 
            )}
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className={cn(
                  "inline-flex items-center justify-center rounded-md px-2 py-1 text-xs font-bold",
                  open 
                    ? "bg-[var(--accent)] text-white" 
                    : "bg-[var(--muted)] text-[var(--muted-foreground)]"
                )}>
                  단서 {stage}
                </span>
                <span className="text-xs font-semibold text-[var(--muted-foreground)]">
                  성공 시: <strong className="text-[var(--foreground)]">{points}점</strong>
                </span>
              </div>

              {!open && (
                <Button
                  type="button"
                  variant={isLocked ? "ghost" : "outline"}
                  size="sm"
                  disabled={isLocked}
                  className={cn(
                    "h-8 text-xs font-medium gap-1.5 shadow-sm",
                    !isLocked && "border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white"
                  )}
                  onClick={() => handleReveal(stage, points)}
                >
                  {isLocked ? (
                    <>
                      <Lock className="h-3 w-3" />
                      이전 단서 먼저
                    </>
                  ) : (
                    <>
                      <Eye className="h-3 w-3" />
                      단서 열기
                    </>
                  )}
                </Button>
              )}
            </div>

            <div className="mt-3">
              {open ? (
                <p className="text-sm leading-relaxed text-[var(--foreground)] animate-fadeIn">
                  {text}
                </p>
              ) : (
                <p className="text-xs text-[var(--muted-foreground)] italic select-none">
                  {isLocked ? "이전 단계의 단서를 열어야 확인할 수 있습니다." : "버튼을 누르면 단서가 공개됩니다."}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}