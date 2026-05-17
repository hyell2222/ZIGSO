"use client";

import { Loader2 } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

import {
  ExpertHintBoard,
  createHintRevealState,
  hintLevelUsedFromReveal,
  type HintRevealState,
} from "@/components/play/expert-hint-board";
import { PlayPhaseShell } from "@/components/play/play-phase-shell";
import { PlayHeaderGroupPlace } from "@/components/play/play-header-group-place";
import { playSurfaceCool } from "@/components/play/play-atmosphere";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { acquireItemForPlayer } from "@/lib/api/play";
import { getItemById } from "@/lib/activity-pack/engine";
import { acquireSuccessMessage, PLAYER_MESSAGES } from "@/lib/activity-pack/player-messages";
import { formatAssignedSlots } from "@/lib/play/assignment-labels";
import { buildItemCodenameMap, formatItemCodenames } from "@/lib/play/role-codenames";
import { PLAY_STUDENT_COPY } from "@/lib/play/student-copy";
import type { ActivityPack } from "@/lib/activity-pack/types";
import { scoreForHintLevel } from "@/lib/activity-pack/scoring";
import { cn } from "@/lib/utils";

type Props = {
  pack: ActivityPack;
  playerId: string;
  groupId: string;
  groupName: string | null;
  /** 세션·샌드박스 id — 항목별 코드명 시드 */
  roleScopeKey: string;
  assignedItemIds: string[];
  acquiredItemIds: Set<string>;
  onAcquired: () => void;
  pending?: boolean;
  sandboxAcquire?: (itemId: string, answer: string, hintStage: 1 | 2 | 3 | 4 | 5) => void;
  contained?: boolean;
};

export function ExpertPhasePanel({
  pack,
  playerId,
  groupId,
  groupName,
  roleScopeKey,
  assignedItemIds,
  acquiredItemIds,
  onAcquired,
  pending,
  sandboxAcquire,
  contained = false,
}: Props) {
  const itemsToAcquire = useMemo(
    () => assignedItemIds.filter((id) => !acquiredItemIds.has(id)),
    [assignedItemIds, acquiredItemIds],
  );

  const [activeItemId, setActiveItemId] = useState<string | null>(itemsToAcquire[0] ?? null);
  const [hintReveal, setHintReveal] = useState<HintRevealState>(createHintRevealState);
  const [answer, setAnswer] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!activeItemId || !itemsToAcquire.includes(activeItemId)) {
      setActiveItemId(itemsToAcquire[0] ?? null);
    }
  }, [activeItemId, itemsToAcquire]);

  useEffect(() => {
    setHintReveal(createHintRevealState());
    setAnswer("");
    setMessage(null);
  }, [activeItemId]);

  const item = activeItemId ? getItemById(pack, activeItemId) : undefined;
  const codenameByItemId = useMemo(
    () => buildItemCodenameMap(roleScopeKey, pack.items.map((i) => i.id)),
    [roleScopeKey, pack.items],
  );

  const placeLabel = useMemo(() => {
    if (activeItemId) {
      return codenameByItemId.get(activeItemId) ?? formatAssignedSlots(assignedItemIds.length);
    }
    return formatItemCodenames(assignedItemIds, codenameByItemId) ?? formatAssignedSlots(assignedItemIds.length);
  }, [activeItemId, assignedItemIds, codenameByItemId]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!item || !activeItemId) return;
    const hintLevelUsed = hintLevelUsedFromReveal(item, hintReveal);
    setMessage(null);
    setSubmitting(true);
    try {
      if (sandboxAcquire) {
        sandboxAcquire(activeItemId, answer, hintLevelUsed);
      } else {
        await acquireItemForPlayer({
          playerId,
          groupId,
          pack,
          itemId: activeItemId,
          answer,
          hintLevelUsed,
        });
      }
      onAcquired();
      setAnswer("");
      setHintReveal(createHintRevealState());
      setMessage(acquireSuccessMessage(scoreForHintLevel(hintLevelUsed)));
    } catch (err) {
      setMessage(err instanceof Error ? err.message : PLAYER_MESSAGES.operationFailed);
    } finally {
      setSubmitting(false);
    }
  };

  const allAcquired = itemsToAcquire.length === 0;

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
            placeName={placeLabel}
            placeLabel={PLAY_STUDENT_COPY.phaseExpert.placeLabel}
            pending={pending}
          />
        ),
      }}
      mainClassName="max-w-2xl"
    >
      <div className={cn("space-y-4 px-4 py-4", playSurfaceCool, "@sm:space-y-5 @sm:px-5 @sm:py-6")}>
        {allAcquired ? (
          <div className="rounded-lg border border-[color-mix(in_srgb,var(--primary)_30%,var(--border))] bg-[var(--tint-accent-weak)] p-3 @sm:p-4">
            <p className="text-sm font-semibold text-[var(--primary)] @md:text-base">
              배정 항목 획득 완료
            </p>
            <p className="mt-2 text-sm leading-relaxed text-[var(--foreground)] @md:text-base">
              {PLAY_STUDENT_COPY.phaseExpert.acquiredReturn}
            </p>
            <p className="mt-4 text-center text-xs text-[var(--muted-foreground)] @md:text-sm">
              {PLAY_STUDENT_COPY.waiting.waitForTeacher}
            </p>
          </div>
        ) : item && activeItemId ? (
          <>
            {assignedItemIds.length > 1 ? (
              <ul className="flex flex-wrap gap-2">
                {assignedItemIds.map((id) => {
                  const done = acquiredItemIds.has(id);
                  const label = codenameByItemId.get(id) ?? id;
                  return (
                    <li key={id}>
                      <button
                        type="button"
                        disabled={done}
                        onClick={() => {
                          if (!done) setActiveItemId(id);
                        }}
                        className={cn(
                          "rounded-full border px-3 py-1 text-xs transition @md:text-sm",
                          done
                            ? "border-[var(--border)] opacity-50"
                            : activeItemId === id
                              ? "border-[var(--primary)] bg-[var(--tint-accent-strong)] text-[var(--primary)]"
                              : "border-[var(--border)] hover:border-[var(--accent)]",
                        )}
                      >
                        {label}
                        {done ? " ✓" : ""}
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : null}

            <ExpertHintBoard item={item} reveal={hintReveal} onRevealChange={setHintReveal} />

            <form id="expert-answer-form" className="space-y-3" onSubmit={handleSubmit}>
              <FormField label="맞출 항목은 무엇일까요?" htmlFor="item-answer">
                <Input
                  id="item-answer"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="정답 입력"
                  autoComplete="off"
                  required
                />
              </FormField>
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
              <div className="flex w-full justify-end pt-1">
                <Button type="submit" className="@sm:min-w-[10rem]" disabled={submitting}>
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
