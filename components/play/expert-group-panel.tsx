"use client";

import { Loader2 } from "lucide-react";
import { FormEvent, useState } from "react";

import { PlayPhaseShell } from "@/components/play/play-phase-shell";
import { PlayHeaderGroupPlace } from "@/components/play/play-header-group-place";
import { playSurfaceCool } from "@/components/play/play-atmosphere";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { acquireItemForPlayer } from "@/lib/api/play";
import { getItemById, hintTextForLevel } from "@/lib/activity-pack/engine";
import { acquireSuccessMessage, PLAYER_MESSAGES } from "@/lib/activity-pack/player-messages";
import { PLAY_STUDENT_COPY } from "@/lib/play/student-copy";
import type { ActivityPack } from "@/lib/activity-pack/types";
import { scoreForHintLevel } from "@/lib/activity-pack/scoring";
import { cn } from "@/lib/utils";

type Props = {
  pack: ActivityPack;
  playerId: string;
  groupId: string;
  groupName: string | null;
  itemId: string;
  acquiredItemIds: Set<string>;
  onAcquired: () => void;
  pending?: boolean;
  sandboxAcquire?: (answer: string, hintStage: 1 | 2 | 3 | 4 | 5) => void;
  contained?: boolean;
};

export function ExpertPhasePanel({
  pack,
  playerId,
  groupId,
  groupName,
  itemId,
  acquiredItemIds,
  onAcquired,
  pending,
  sandboxAcquire,
  contained = false,
}: Props) {
  const item = getItemById(pack, itemId);
  const alreadyAcquired = acquiredItemIds.has(itemId);
  const [hintStage, setHintStage] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [answer, setAnswer] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const roleLabel = item?.name ?? itemId;

  const handleRevealNext = () => {
    setHintStage((s) => (s < 5 ? ((s + 1) as 1 | 2 | 3 | 4 | 5) : s));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!item || alreadyAcquired) return;
    setMessage(null);
    setSubmitting(true);
    try {
      if (sandboxAcquire) {
        sandboxAcquire(answer, hintStage);
      } else {
        await acquireItemForPlayer({
          playerId,
          groupId,
          pack,
          itemId,
          answer,
          hintLevelUsed: hintStage,
        });
      }
      onAcquired();
      setMessage(acquireSuccessMessage(scoreForHintLevel(hintStage)));
    } catch (err) {
      setMessage(err instanceof Error ? err.message : PLAYER_MESSAGES.operationFailed);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PlayPhaseShell
      contained={contained}
      header={{
        phase: 2,
        title: PLAY_STUDENT_COPY.phaseExpert.title,
        description: PLAY_STUDENT_COPY.phaseExpert.description,
        rightSlot: (
          <PlayHeaderGroupPlace
            groupName={groupName}
            placeName={roleLabel}
            placeLabel={PLAY_STUDENT_COPY.phaseExpert.placeLabel}
            pending={pending}
          />
        ),
      }}
      mainClassName="max-w-2xl"
    >
      <div className={cn("space-y-4 px-4 py-4", playSurfaceCool, "@sm:space-y-5 @sm:px-5 @sm:py-6")}>
        {alreadyAcquired ? (
          <div className="rounded-lg border border-[color-mix(in_srgb,var(--primary)_30%,var(--border))] bg-[var(--tint-accent-weak)] p-3 @sm:p-4">
            <p className="text-sm font-semibold text-[var(--primary)] @md:text-base">
              항목 획득 완료
            </p>
            <p className="mt-2 text-sm leading-relaxed text-[var(--foreground)] @md:text-base">
              <strong>{roleLabel}</strong> — {PLAY_STUDENT_COPY.phaseExpert.acquiredReturn}
            </p>
            {item?.groupHint ? (
              <p className="mt-2 text-sm text-[var(--muted-foreground)] @md:text-base">
                모둠 메모: {item.groupHint}
              </p>
            ) : null}
            <p className="mt-4 text-center text-xs text-[var(--muted-foreground)] @md:text-sm">
              {PLAY_STUDENT_COPY.waiting.waitForTeacher}
            </p>
          </div>
        ) : item ? (
          <>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)] @md:text-sm">
                힌트 {hintStage} / 5 · 정답 시 {scoreForHintLevel(hintStage)}점
              </p>
              <p className="mt-2 text-sm leading-relaxed text-[var(--foreground)] @md:text-base">
                {hintTextForLevel(item, hintStage)}
              </p>
            </div>
            <form id="expert-answer-form" className="space-y-3" onSubmit={handleSubmit}>
              <label
                className="text-sm font-medium text-[var(--foreground)] @md:text-base"
                htmlFor="item-answer"
              >
                맞출 항목은 무엇일까요?
              </label>
              <Input
                id="item-answer"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="정답 입력"
                autoComplete="off"
                required
              />
              {message ? (
                <p
                  className={cn(
                    "text-sm @md:text-base",
                    message.startsWith("정답") ? "text-[var(--primary)]" : "text-[var(--danger)]",
                  )}
                >
                  {message}
                </p>
              ) : null}
              <div className="flex w-full flex-row flex-wrap items-center justify-between gap-2 pt-1 [&_button]:w-auto [&_button]:shrink-0">
                {hintStage < 5 ? (
                  <Button type="button" variant="outline" onClick={handleRevealNext}>
                    다음 힌트 보기
                  </Button>
                ) : null}
                <Button
                  type="submit"
                  className="@sm:min-w-[10rem]"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin @sm:h-4 @sm:w-4" aria-hidden />
                      확인 중…
                    </>
                  ) : (
                    "정답 제출"
                  )}
                </Button>
              </div>
            </form>
          </>
        ) : (
          <p className="text-sm text-[var(--danger)] @md:text-base">항목 정보를 찾을 수 없습니다.</p>
        )}
      </div>
    </PlayPhaseShell>
  );
}
