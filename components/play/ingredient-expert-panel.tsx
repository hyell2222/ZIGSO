"use client";

import { Loader2 } from "lucide-react";
import { FormEvent, useState } from "react";

import {
  PlayAtmosphere,
  playPhaseHeaderChromeInner,
  playPhaseHeaderChromeShell,
  playSurfaceCool,
} from "@/components/play/play-atmosphere";
import { PlayHeaderTeamPlace } from "@/components/play/play-header-team-place";
import { PlayPhaseHeader } from "@/components/play/play-phase-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { acquireIngredientForPlayer } from "@/lib/api/play";
import { getIngredientById, hintTextForStage } from "@/lib/lunch/engine";
import { acquireSuccessMessage, PLAYER_MESSAGES } from "@/lib/lunch/player-messages";
import type { ScenarioPack } from "@/lib/lunch/types";
import { scoreForHintStage } from "@/lib/lunch/scoring";
import { cn } from "@/lib/utils";

type Props = {
  pack: ScenarioPack;
  playerId: string;
  teamId: string;
  teamName: string | null;
  ingredientId: string;
  acquiredIngredientIds: Set<string>;
  onAcquired: () => void;
  pending?: boolean;
  /** 샌드박스: API 대신 로컬 콜백 */
  sandboxAcquire?: (answer: string, hintStage: 1 | 2 | 3 | 4 | 5) => void;
};

export function IngredientExpertPanel({
  pack,
  playerId,
  teamId,
  teamName,
  ingredientId,
  acquiredIngredientIds,
  onAcquired,
  pending,
  sandboxAcquire,
}: Props) {
  const ingredient = getIngredientById(pack, ingredientId);
  const alreadyAcquired = acquiredIngredientIds.has(ingredientId);
  const [hintStage, setHintStage] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [answer, setAnswer] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const ingredientLabel = ingredient?.name ?? ingredientId;

  const handleRevealNext = () => {
    setHintStage((s) => (s < 5 ? ((s + 1) as 1 | 2 | 3 | 4 | 5) : s));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!ingredient || alreadyAcquired) return;
    setMessage(null);
    setSubmitting(true);
    try {
      if (sandboxAcquire) {
        sandboxAcquire(answer, hintStage);
      } else {
        await acquireIngredientForPlayer({
          playerId,
          teamId,
          pack,
          ingredientId,
          answer,
          hintStageUsed: hintStage,
        });
      }
      onAcquired();
      setMessage(acquireSuccessMessage(scoreForHintStage(hintStage)));
    } catch (err) {
      setMessage(err instanceof Error ? err.message : PLAYER_MESSAGES.submitFailed);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PlayAtmosphere>
      <div className="flex min-h-dvh flex-col">
        <header className={playPhaseHeaderChromeShell}>
          <div className={playPhaseHeaderChromeInner}>
            <PlayPhaseHeader
              phase={2}
              title="재료 전문가 활동"
              description="같은 재료 전문가끼리 모여 힌트를 읽고 재료를 추리하세요. 맞히면 조로 돌아가 공유합니다."
              rightSlot={
                <PlayHeaderTeamPlace
                  teamName={teamName}
                  placeName={ingredientLabel}
                  placeLabel="전문 재료"
                  pending={pending}
                />
              }
            />
          </div>
        </header>

        <main className="mx-auto w-full max-w-2xl flex-1 space-y-5 px-4 py-6 pb-[max(3rem,env(safe-area-inset-bottom,0px))] sm:px-6 sm:py-8">
          <div className={cn("space-y-5 px-5 py-6", playSurfaceCool)}>
            {alreadyAcquired ? (
              <div className="rounded-lg border border-[color-mix(in_srgb,var(--primary)_30%,var(--border))] bg-[var(--tint-accent-weak)] p-4 text-sm">
                <p className="font-semibold text-[var(--primary)]">재료 획득 완료</p>
                <p className="mt-2 text-[var(--foreground)]">
                  <strong>{ingredientLabel}</strong> — 조로 돌아가 팀원에게 알려 주세요.
                </p>
                {ingredient?.cookingHint ? (
                  <p className="mt-2 text-[var(--muted-foreground)]">
                    조리 힌트: {ingredient.cookingHint}
                  </p>
                ) : null}
              </div>
            ) : ingredient ? (
              <>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
                    힌트 {hintStage} / 5 · 정답 시 {scoreForHintStage(hintStage)}점
                  </p>
                  <p className="mt-2 text-base leading-relaxed text-[var(--foreground)]">
                    {hintTextForStage(ingredient, hintStage)}
                  </p>
                </div>
                {hintStage < 5 ? (
                  <Button type="button" variant="outline" onClick={handleRevealNext}>
                    다음 힌트 보기 (점수 감소)
                  </Button>
                ) : null}
                <form className="space-y-3" onSubmit={handleSubmit}>
                  <label className="text-sm font-medium text-[var(--foreground)]" htmlFor="ingredient-answer">
                    어떤 재료일까요? (영어로 입력)
                  </label>
                  <Input
                    id="ingredient-answer"
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    placeholder="예: tomato"
                    autoComplete="off"
                    required
                  />
                  {message ? (
                    <p
                      className={cn(
                        "text-sm",
                        message.startsWith("정답") ? "text-[var(--primary)]" : "text-[var(--danger)]",
                      )}
                    >
                      {message}
                    </p>
                  ) : null}
                  <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                        확인 중…
                      </>
                    ) : (
                      "정답 제출"
                    )}
                  </Button>
                </form>
              </>
            ) : (
              <p className="text-sm text-[var(--danger)]">재료 정보를 찾을 수 없습니다.</p>
            )}
          </div>
        </main>
      </div>
    </PlayAtmosphere>
  );
}
