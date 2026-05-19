"use client";

import { Loader2 } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

import {
  ExpertClueBoard,
  createClueRevealState,
  clueLevelUsedFromReveal,
  type ClueRevealState,
} from "@/components/play/expert-clue-board";
import { PlayPhaseShell } from "@/components/play/play-phase-shell";
import { PlayHeaderGroupPlace } from "@/components/play/play-header-group-place";
import {
  PlayPhaseCallout,
  PlayPhaseMessage,
  PlayPhasePanel,
  PlayPhaseSection,
  PlayPhaseSectionBadge,
  PlayPhaseWaitFootnote,
  playPhaseFormActions,
} from "@/components/play/play-phase-layout";
import { activityLayoutType } from "@/components/activity/activity-layout-typography";
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
import { scoreForClueLevel } from "@/lib/activity-pack/scoring";
import { cn } from "@/lib/utils";

type Props = {
  pack: ActivityPack;
  playerId: string;
  groupId: string;
  groupName: string | null;
  roleScopeKey: string;
  assignedItemIds: string[];
  acquiredItemIds: Set<string>;
  onAcquired: () => void;
  pending?: boolean;
  sandboxAcquire?: (itemId: string, answer: string, clueStage: 1 | 2 | 3 | 4 | 5) => void;
  contained?: boolean;
};

const t = activityLayoutType;

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
  const [clueReveal, setClueReveal] = useState<ClueRevealState>(createClueRevealState);
  const [answer, setAnswer] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!activeItemId || !itemsToAcquire.includes(activeItemId)) {
      setActiveItemId(itemsToAcquire[0] ?? null);
    }
  }, [activeItemId, itemsToAcquire]);

  useEffect(() => {
    setClueReveal(createClueRevealState());
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
    const clueLevelUsed = clueLevelUsedFromReveal(item, clueReveal);
    setMessage(null);
    setSubmitting(true);
    try {
      if (sandboxAcquire) {
        sandboxAcquire(activeItemId, answer, clueLevelUsed);
      } else {
        await acquireItemForPlayer({
          playerId,
          groupId,
          pack,
          itemId: activeItemId,
          answer,
          clueLevelUsed,
        });
      }
      onAcquired();
      setAnswer("");
      setClueReveal(createClueRevealState());
      setMessage(acquireSuccessMessage(scoreForClueLevel(clueLevelUsed)));
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
            contained={contained}
          />
        ),
      }}
    >
      <PlayPhasePanel>
        {allAcquired ? (
          <PlayPhaseCallout title="배정 아이템 획득 완료" centered>
            <p className={t.playPanelBody}>{PLAY_STUDENT_COPY.phaseExpert.acquiredReturn}</p>
            <PlayPhaseWaitFootnote className="mt-4" />
          </PlayPhaseCallout>
        ) : item && activeItemId ? (
          <>
            {assignedItemIds.length > 1 ? (
              <PlayPhaseSection
                title="내 배정 아이템"
                headerExtra={
                  <PlayPhaseSectionBadge>
                    {acquiredItemIds.size}/{assignedItemIds.length} 획득
                  </PlayPhaseSectionBadge>
                }
              >
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
                            "rounded-full border px-3 py-1 transition",
                            t.playPanelChip,
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
              </PlayPhaseSection>
            ) : null}

            <ExpertClueBoard item={item} reveal={clueReveal} onRevealChange={setClueReveal} />

            <PlayPhaseSection title="정답 제출" variant="active">
            <form id="expert-answer-form" className="space-y-3" onSubmit={handleSubmit}>
              <FormField label="이것은 무엇일까요?" htmlFor="item-answer">
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
                <PlayPhaseMessage message={message} success={message.startsWith("정답")} />
              ) : null}
              <div className={playPhaseFormActions}>
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
            </PlayPhaseSection>
          </>
        ) : (
          <PlayPhaseMessage message="아이템 정보를 찾을 수 없습니다." />
        )}
      </PlayPhasePanel>
    </PlayPhaseShell>
  );
}
