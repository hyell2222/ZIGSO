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
  embedded?: boolean;
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
  embedded = false,
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
      embedded={embedded}
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
            compact={embedded}
          />
        ),
      }}
      mainClassName="max-w-2xl"
    >
      <div className={cn("space-y-5 px-5 py-6", playSurfaceCool)}>
        {alreadyAcquired ? (
          <div className="rounded-lg border border-[color-mix(in_srgb,var(--primary)_30%,var(--border))] bg-[var(--tint-accent-weak)] p-4 text-sm">
            <p className="font-semibold text-[var(--primary)]">항목 획득 완료</p>
            <p className="mt-2 text-[var(--foreground)]">
              <strong>{roleLabel}</strong> — {PLAY_STUDENT_COPY.phaseExpert.acquiredReturn}
            </p>
            {item?.groupHint ? (
              <p className="mt-2 text-[var(--muted-foreground)]">모둠 메모: {item.groupHint}</p>
            ) : null}
            <p className="mt-4 text-center text-xs text-[var(--muted-foreground)]">
              {PLAY_STUDENT_COPY.waiting.waitForTeacher}
            </p>
          </div>
        ) : item ? (
          <>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
                힌트 {hintStage} / 5 · 정답 시 {scoreForHintLevel(hintStage)}점
              </p>
              <p className="mt-2 text-base leading-relaxed text-[var(--foreground)]">
                {hintTextForLevel(item, hintStage)}
              </p>
            </div>
            <form id="expert-answer-form" className="space-y-3" onSubmit={handleSubmit}>
              <label className="text-sm font-medium text-[var(--foreground)]" htmlFor="item-answer">
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
                    "text-sm",
                    message.startsWith("정답") ? "text-[var(--primary)]" : "text-[var(--danger)]",
                  )}
                >
                  {message}
                </p>
              ) : null}
              <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:justify-end">
                {hintStage < 5 ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full sm:w-auto"
                    onClick={handleRevealNext}
                  >
                    다음 힌트 보기
                  </Button>
                ) : null}
                <Button type="submit" className="w-full sm:min-w-[10rem] sm:w-auto" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
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
          <p className="text-sm text-[var(--danger)]">항목 정보를 찾을 수 없습니다.</p>
        )}
      </div>
    </PlayPhaseShell>
  );
}
