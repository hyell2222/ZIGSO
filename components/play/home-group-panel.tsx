"use client";

import { Loader2 } from "lucide-react";
import { useMemo, useState } from "react";

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
import {
  completeActivityForGroup,
  listGroupMembers,
  placeWordCardOnSlot,
  type GroupRow,
  type PlayerSelfRow,
} from "@/lib/api/play";
import {
  availableWordCards,
  isWorksheetComplete,
  totalGroupScore,
  worksheetProgress,
  PLAYER_MESSAGES,
  slotOwnerForRole,
} from "@/lib/activity-pack/engine";
import { parsePassageSegments } from "@/lib/activity-pack/worksheet";
import type { ActivityPack } from "@/lib/activity-pack/types";
import { cn } from "@/lib/utils";

const t = activityLayoutType;

export type GroupMember = Pick<
  PlayerSelfRow,
  "id" | "nickname" | "assigned_role_id" | "assigned_item_ids" | "word_cards" | "created_at"
>;

type Props = {
  pack: ActivityPack;
  group: GroupRow;
  groupName: string | null;
  playerId: string;
  assignedRoleId: string | null;
  wordCards: PlayerSelfRow["word_cards"];
  members: GroupMember[];
  onUpdate: () => void;
  pending?: boolean;
  sandboxPlace?: (slotOwnerPlayerId: string, slotId: string, itemId: string) => void;
  sandboxComplete?: () => void;
  contained?: boolean;
};

function isSuccessMessage(message: string) {
  return message.includes("넣었") || message.includes("완성") || message.includes("마쳤");
}

export function GroupPhasePanel({
  pack,
  group,
  groupName,
  playerId,
  assignedRoleId,
  wordCards,
  members,
  onUpdate,
  pending,
  sandboxPlace,
  sandboxComplete,
  contained = false,
}: Props) {
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const worksheet = pack.homeWorksheet;
  const segments = useMemo(
    () => parsePassageSegments(worksheet.summaryPassage),
    [worksheet.summaryPassage],
  );
  const slotById = useMemo(
    () => new Map(worksheet.slots.map((s) => [s.id, s])),
    [worksheet.slots],
  );
  const placementBySlot = useMemo(
    () => new Map(group.worksheet_placements.map((p) => [p.slotId, p])),
    [group.worksheet_placements],
  );
  const itemNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of pack.items) map.set(item.id, item.name);
    return map;
  }, [pack.items]);

  const ownerPlayerByRole = useMemo(() => {
    const map = new Map<string, GroupMember>();
    for (const role of pack.roles) {
      const ownerId = slotOwnerForRole(members, role.id)?.id;
      const owner = ownerId ? members.find((m) => m.id === ownerId) : undefined;
      if (owner) map.set(role.id, owner);
    }
    return map;
  }, [members, pack.roles]);

  const inventory = availableWordCards(wordCards);
  const progress = worksheetProgress(pack, group.worksheet_placements);
  const activityCompleted = Boolean(group.completed_at);
  const canSubmitActivity =
    !activityCompleted && isWorksheetComplete(pack, group.worksheet_placements);

  const allCards = [...wordCards, ...members.flatMap((m) => m.word_cards ?? [])];
  const groupScore = totalGroupScore(allCards, group.worksheet_placements);

  const handlePlace = async (slotOwnerPlayerId: string, slotId: string, itemId: string) => {
    setMessage(null);
    setBusy(true);
    try {
      if (sandboxPlace) {
        sandboxPlace(slotOwnerPlayerId, slotId, itemId);
      } else {
        await placeWordCardOnSlot({
          actorPlayerId: playerId,
          slotOwnerPlayerId,
          groupId: group.id,
          pack,
          slotId,
          itemId,
        });
      }
      onUpdate();
      const name = itemNameById.get(itemId) ?? itemId;
      setMessage(`「${name}」카드를 빈칸에 넣었어요!`);
      setSelectedItemId(null);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : PLAYER_MESSAGES.operationFailed);
    } finally {
      setBusy(false);
    }
  };

  const handleCompleteActivity = async () => {
    setMessage(null);
    setBusy(true);
    try {
      if (sandboxComplete) {
        sandboxComplete();
      } else {
        await completeActivityForGroup(group.id, pack);
      }
      onUpdate();
      setMessage("공유 학습지를 완성했어요. 수고했어요!");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : PLAYER_MESSAGES.operationFailed);
    } finally {
      setBusy(false);
    }
  };

  const renderSlot = (slotId: string) => {
    const slot = slotById.get(slotId);
    if (!slot) {
      return (
        <span key={slotId} className="text-[var(--danger)]">
          ?
        </span>
      );
    }

    const placement = placementBySlot.get(slotId);
    const owner = ownerPlayerByRole.get(slot.ownerRoleId);
    const ownerPlayerId = owner?.id ?? "";
    const isOwnSlot = ownerPlayerId === playerId || slot.ownerRoleId === assignedRoleId;
    const filled = Boolean(placement);
    const wordName = filled
      ? (itemNameById.get(placement!.itemId) ?? placement!.itemId)
      : (itemNameById.get(slot.itemId) ?? slot.itemId);
    const ownerLabel = owner?.nickname ?? slot.ownerRoleId;

    const canPlace =
      !filled &&
      !isOwnSlot &&
      selectedItemId === slot.itemId &&
      inventory.some((c) => c.itemId === slot.itemId);

    if (filled) {
      return (
        <span
          key={slotId}
          className={cn(
            "mx-0.5 inline-flex items-center rounded-md border border-[var(--primary)] bg-[var(--tint-accent-weak)] px-2 py-0.5 font-semibold text-[var(--primary)]",
            t.playPanelChip,
          )}
        >
          {wordName}
        </span>
      );
    }

    return (
      <button
        key={slotId}
        type="button"
        disabled={busy || isOwnSlot || !canPlace}
        onClick={() => {
          if (canPlace && ownerPlayerId) {
            void handlePlace(ownerPlayerId, slotId, slot.itemId);
          }
        }}
        title={
          isOwnSlot
            ? `${ownerLabel}의 빈칸 — 직접 넣을 수 없어요. 팀원이 도와주세요.`
            : canPlace
              ? `${ownerLabel}의 빈칸에 넣기`
              : `${ownerLabel}의 빈칸 · 필요 단어: ${wordName}`
        }
        className={cn(
          "mx-0.5 inline-flex min-w-[4.5rem] items-center justify-center rounded-md border border-dashed px-2 py-0.5 transition",
          t.playPanelChip,
          isOwnSlot &&
            "cursor-not-allowed border-[var(--border)] bg-[var(--muted)]/30 text-[var(--muted-foreground)]",
          !isOwnSlot &&
            canPlace &&
            "border-[var(--primary)] bg-[var(--tint-accent-strong)] text-[var(--primary)] ring-2 ring-[var(--primary)]/30",
          !isOwnSlot &&
            !canPlace &&
            "border-[var(--border)] bg-[var(--background)] text-[var(--muted-foreground)]",
        )}
      >
        {isOwnSlot ? "내 빈칸" : canPlace ? wordName : "___"}
      </button>
    );
  };

  return (
    <PlayPhaseShell
      contained={contained}
      header={{
        phase: 3,
        title: "홈 집단",
        description:
          "공유 학습지의 최종 요약문 빈칸을 채우세요. 내 단어 카드는 내 빈칸에 넣을 수 없고, 팀원 슬롯에만 넣을 수 있습니다.",
        rightSlot: (
          <PlayHeaderGroupPlace
            groupName={groupName}
            placeName={`${groupScore}점`}
            placeLabel="모둠 점수"
            pending={pending}
            contained={contained}
          />
        ),
      }}
    >
      <PlayPhasePanel>
        <PlayPhaseSection
          title="최종 요약문"
          headerExtra={
            <PlayPhaseSectionBadge>
              {progress.filled}/{progress.required} 빈칸
            </PlayPhaseSectionBadge>
          }
        >
          <p className={cn("mb-4", t.playPanelHint)}>
            카드를 선택한 뒤, 팀원의 활성 슬롯(또는 요약문의 팀원 빈칸)을 눌러 넣으세요. 내 빈칸은 회색으로 표시됩니다.
          </p>
          <div
            className={cn(
              "rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-4 @md:p-6",
              t.playPanelBody,
              "leading-relaxed",
            )}
          >
            {segments.map((seg, i) =>
              seg.type === "text" ? (
                <span key={`t-${i}`}>{seg.value}</span>
              ) : (
                renderSlot(seg.slotId)
              ),
            )}
          </div>
        </PlayPhaseSection>

        <PlayPhaseSection title="내 단어 카드">
          {inventory.length === 0 ? (
            <p className={t.playPanelBody}>
              사용 가능한 단어 카드가 없어요. 전문가 집단에서 단어를 획득하세요.
            </p>
          ) : (
            <>
              <p className={cn("mb-2", t.playPanelHint)}>카드를 선택한 뒤 팀원 슬롯에 배치하세요.</p>
              <ul className="flex flex-wrap gap-2">
                {inventory.map((card) => {
                  const name = itemNameById.get(card.itemId) ?? card.itemId;
                  const selected = selectedItemId === card.itemId;
                  return (
                    <li key={card.itemId}>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setSelectedItemId(selected ? null : card.itemId)}
                        className={cn(
                          "rounded-full border px-3 py-1.5 transition",
                          t.playPanelChip,
                          selected
                            ? "border-[var(--primary)] bg-[var(--tint-accent-strong)] text-[var(--primary)] ring-2 ring-[var(--primary)]/30"
                            : "border-[var(--border)] bg-[var(--tint-accent-weak)] hover:border-[var(--accent)]",
                        )}
                      >
                        🃏 {name}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </PlayPhaseSection>

        <PlayPhaseSection title="팀원 활성 슬롯">
          <ul className="space-y-2">
            {members
              .filter(
                (m) =>
                  m.id !== playerId &&
                  m.assigned_role_id &&
                  slotOwnerForRole(members, m.assigned_role_id)?.id === m.id,
              )
              .map((m) => {
                const roleSlots = worksheet.slots.filter(
                  (s) => s.ownerRoleId === m.assigned_role_id,
                );
                return (
                  <li
                    key={m.id}
                    className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3"
                  >
                    <p className={cn("mb-2 font-medium", t.playPanelRow)}>
                      {m.nickname ?? "팀원"} · 슬롯 소유
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {roleSlots.map((slot) => {
                        const filled = placementBySlot.has(slot.id);
                        const name = itemNameById.get(slot.itemId) ?? slot.itemId;
                        const canPlace =
                          !filled &&
                          selectedItemId === slot.itemId &&
                          inventory.some((c) => c.itemId === slot.itemId);
                        return (
                          <button
                            key={slot.id}
                            type="button"
                            disabled={busy || filled || !canPlace}
                            onClick={() => void handlePlace(m.id, slot.id, slot.itemId)}
                            className={cn(
                              "rounded-md border px-2 py-1 text-sm transition",
                              filled
                                ? "border-[var(--primary)] bg-[var(--tint-accent-weak)]"
                                : canPlace
                                  ? "border-[var(--primary)] bg-[var(--tint-accent-strong)] ring-2 ring-[var(--primary)]/30"
                                  : "border-dashed border-[var(--border)]",
                            )}
                          >
                            {filled ? name : canPlace ? `넣기: ${name}` : name}
                          </button>
                        );
                      })}
                    </div>
                  </li>
                );
              })}
          </ul>
        </PlayPhaseSection>

        {canSubmitActivity ? (
          <PlayPhaseSection title="학습지 완성">
            <p className={t.playPanelBody}>모든 빈칸을 채웠어요. 공유 학습지를 제출해 주세요.</p>
            <div className={playPhaseFormActions}>
              <Button type="button" onClick={() => void handleCompleteActivity()} disabled={busy}>
                {busy ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                    제출 중…
                  </>
                ) : (
                  "학습지 제출"
                )}
              </Button>
            </div>
          </PlayPhaseSection>
        ) : null}

        {activityCompleted ? (
          <PlayPhaseCallout title="학습지 제출 완료" centered>
            <p className={t.playPanelCalloutBody}>모둠 최종 점수: {groupScore}점</p>
            <PlayPhaseWaitFootnote className="mt-4" />
          </PlayPhaseCallout>
        ) : null}

        {message ? (
          <PlayPhaseMessage message={message} success={isSuccessMessage(message)} />
        ) : null}
      </PlayPhasePanel>
    </PlayPhaseShell>
  );
}

export async function fetchGroupMembersForPlay(groupId: string): Promise<GroupMember[]> {
  const rows = await listGroupMembers(groupId);
  return rows.map((r) => ({
    id: r.id,
    nickname: r.nickname,
    assigned_role_id: r.assigned_role_id,
    assigned_item_ids: r.assigned_item_ids,
    word_cards: r.word_cards,
    created_at: r.created_at,
  }));
}
