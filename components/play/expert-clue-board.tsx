"use client";

import { useMemo, useEffect } from "react";
import { Lock, Eye, Lightbulb } from "lucide-react";

import { activityNestedCard } from "@/components/activity/activity-layout-chrome";
import { activityLayoutType } from "@/components/activity/activity-layout-typography";
import { PlayPhaseSection } from "@/components/play/play-phase-layout";
import { Button } from "@/components/ui/button";
import { clueTextForLevel } from "@/lib/activity-pack/engine";
import type { Item } from "@/lib/activity-pack/types";
import { scoreForClueLevel } from "@/lib/activity-pack/scoring";
import { cn } from "@/lib/utils";

const HINT_STAGES = [1, 2, 3, 4, 5] as const;
type StageType = (typeof HINT_STAGES)[number];

const t = activityLayoutType;

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

  return (
    <PlayPhaseSection title="단서 보드">
      <div
        className={cn(
          activityNestedCard,
          "flex items-start gap-2.5 border-[color-mix(in_srgb,var(--primary)_30%,var(--border))] bg-[var(--tint-accent-weak)]",
        )}
      >
        <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)]" aria-hidden />
        <div className="space-y-1">
          <p className={t.playPanelHint}>적은 단서로 정답을 맞출수록 높은 점수를 얻습니다!</p>
          <p className={t.caption}>
            현재 성공 시 획득 점수:{" "}
            <span className={cn(t.nestedCardScore, "text-base @md:text-lg")}>
              {scoreForClueLevel(clueLevelUsed)}점
            </span>
          </p>
        </div>
      </div>

      <ul className="mt-3 space-y-2">
        {stages.map(({ stage, text, open, isLocked, points }) => (
          <li
            key={stage}
            className={cn(
              activityNestedCard,
              "transition-all duration-200",
              open
                ? "border-[color-mix(in_srgb,var(--primary)_30%,var(--border))]"
                : isLocked
                  ? "opacity-60"
                  : "hover:border-[var(--accent)]",
            )}
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "inline-flex items-center justify-center rounded-md px-2 py-1 text-xs font-bold",
                    open
                      ? "bg-[var(--accent)] text-[var(--on-primary)]"
                      : "bg-[var(--muted)] text-[var(--muted-foreground)]",
                  )}
                >
                  단서 {stage}
                </span>
                <span className={t.playPanelRowMeta}>
                  성공 시: <strong className={t.playPanelRow}>{points}점</strong>
                </span>
              </div>

              {!open ? (
                <Button
                  type="button"
                  variant={isLocked ? "ghost" : "outline"}
                  size="sm"
                  disabled={isLocked}
                  className={cn(
                    "h-8 gap-1.5 text-xs font-medium",
                    !isLocked &&
                      "border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-[var(--on-primary)]",
                  )}
                  onClick={() => onRevealChange({ ...reveal, [stage]: true })}
                >
                  {isLocked ? (
                    <>
                      <Lock className="h-3 w-3" aria-hidden />
                      이전 단서 먼저
                    </>
                  ) : (
                    <>
                      <Eye className="h-3 w-3" aria-hidden />
                      단서 열기
                    </>
                  )}
                </Button>
              ) : null}
            </div>

            <div className="mt-3">
              {open ? (
                <p className={t.playPanelBody}>{text}</p>
              ) : (
                <p className={cn(t.caption, "italic")}>
                  {isLocked
                    ? "이전 단계의 단서를 열어야 확인할 수 있습니다."
                    : "버튼을 누르면 단서가 공개됩니다."}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </PlayPhaseSection>
  );
}
