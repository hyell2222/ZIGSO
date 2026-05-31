"use client";

import { CheckSquare, Loader2, Puzzle, Square } from "lucide-react";
import { useMemo, useState, useEffect } from "react";

import { PlayPhaseShell } from "@/components/play/play-phase-shell";
import { PlayHeaderGroupPlace } from "@/components/play/play-header-group-place";
import {
  PlayPhaseCallout,
  PlayPhaseEmptyState,
  PlayPhaseMessage,
  playPhaseListRowClass,
  PlayPhasePanel,
  PlayPhaseSection,
  PlayPhaseSectionBadge,
  PlayPhaseWaitFootnote,
  playPhaseFormActions,
} from "@/components/play/play-phase-layout";
import { activityLayoutType } from "@/components/activity/activity-layout-typography";
import { Button } from "@/components/ui/button";
import { completeActivityForGroup, completeTaskForGroup } from "@/lib/api/play";
import { totalGroupScore } from "@/lib/activity-pack/engine";
import { taskCompleteMessage, PLAYER_MESSAGES, PLAYER_COPY } from "@/lib/copy/player";
import { STUDENT_COPY } from "@/lib/copy/student";
import type { ActivityPack } from "@/lib/activity-pack/types";
import type { GroupRow } from "@/lib/api/play";
import { cn } from "@/lib/utils";

const HOME = STUDENT_COPY.phaseHome;

type Props = {
  pack: ActivityPack;
  group: GroupRow;
  groupName: string | null;
  onUpdate: () => void;
  pending?: boolean;
  sandboxCompleteTask?: (taskId: string, itemIds: string[]) => void;
  sandboxCompleteActivity?: () => void;
  contained?: boolean;
};

const t = activityLayoutType;

function isSuccessMessage(message: string) {
  return message.includes("미션 완료") || message.includes("마쳤");
}

export function GroupPhasePanel({
  pack,
  group,
  groupName,
  onUpdate,
  pending,
  sandboxCompleteTask,
  sandboxCompleteActivity,
  contained = false,
}: Props) {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(
    pack.tasks[0]?.id ?? null,
  );
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const task = pack.tasks.find((c) => c.id === selectedTaskId) ?? null;
  const completedIds = new Set(group.completed_tasks.map((m) => m.taskId));
  const activityCompleted = Boolean(group.completed_at);
  const groupScore = totalGroupScore(group.acquired_items, group.completed_tasks);

  const itemNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of pack.items) map.set(item.id, item.name);
    return map;
  }, [pack.items]);

  useEffect(() => {
    setSelectedItemIds([]);
    setMessage(null);
  }, [selectedTaskId]);

  const handleToggleItem = (itemId: string) => {
    setSelectedItemIds((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId],
    );
  };

  const handleCompleteTask = async () => {
    if (!selectedTaskId || !task || selectedItemIds.length === 0) return;
    setMessage(null);
    setBusy(true);
    try {
      if (sandboxCompleteTask) {
        sandboxCompleteTask(selectedTaskId, selectedItemIds);
      } else {
        await completeTaskForGroup({
          groupId: group.id,
          pack,
          taskId: selectedTaskId,
          submittedItemIds: selectedItemIds,
        });
      }
      onUpdate();
      setMessage(taskCompleteMessage(task.title, selectedItemIds.length * 3));
      setSelectedItemIds([]);
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
      if (sandboxCompleteActivity) {
        sandboxCompleteActivity();
      } else {
        await completeActivityForGroup(group.id, pack);
      }
      onUpdate();
      setMessage(PLAYER_COPY.activityComplete);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : PLAYER_MESSAGES.operationFailed);
    } finally {
      setBusy(false);
    }
  };

  const canSubmitActivity =
    !activityCompleted && completedIds.size >= pack.tasks.length;

  return (
    <PlayPhaseShell
      contained={contained}
      header={{
        phase: 3,
        title: HOME.title,
        description: HOME.description,
        rightSlot: (
          <PlayHeaderGroupPlace
            groupName={groupName}
            placeName={`${groupScore}점`}
            placeLabel={HOME.scoreLabel}
            pending={pending}
            contained={contained}
          />
        ),
      }}
    >
      <PlayPhasePanel>
        <PlayPhaseSection
          title={HOME.pooledItemsSection}
          headerExtra={
            <PlayPhaseSectionBadge>{group.acquired_items.length}개</PlayPhaseSectionBadge>
          }
        >
          {group.acquired_items.length === 0 ? (
            <PlayPhaseEmptyState>
              <p className={t.playPanelBody}>{HOME.emptyPool}</p>
              <p className={cn("mt-1", t.caption)}>{HOME.emptyPoolHint}</p>
            </PlayPhaseEmptyState>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {group.acquired_items.map((a) => (
                <li
                  key={a.itemId}
                  className={cn(
                    "rounded-full border border-[var(--border)] bg-[var(--tint-accent-weak)] px-3 py-1",
                    t.playPanelChip,
                  )}
                >
                  🔍 {itemNameById.get(a.itemId) ?? a.itemId} (+{a.score}점)
                </li>
              ))}
            </ul>
          )}
        </PlayPhaseSection>

        <PlayPhaseSection
          title={HOME.missionsSection}
          headerExtra={
            <PlayPhaseSectionBadge>
              {HOME.completionBadge(completedIds.size, pack.tasks.length)}
            </PlayPhaseSectionBadge>
          }
        >
          <ul className="space-y-2">
            {pack.tasks.map((ch) => {
              const done = completedIds.has(ch.id);
              return (
                <li key={ch.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedTaskId(ch.id)}
                    className={cn(
                      playPhaseListRowClass,
                      selectedTaskId === ch.id
                        ? "border-[var(--primary)] bg-[var(--tint-accent-weak)]"
                        : "hover:bg-[var(--tint-mystery)]",
                      done && "opacity-70",
                    )}
                  >
                    <Puzzle className="h-3.5 w-3.5 shrink-0 text-[var(--accent)] @md:h-4 @md:w-4" aria-hidden />
                    <span className={cn("min-w-0 flex-1", t.playPanelRow)}>{ch.title}</span>
                    <span className={cn("shrink-0", t.playPanelRowMeta)}>
                      {done ? HOME.missionDone : HOME.missionChallenging}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </PlayPhaseSection>

        {task && !completedIds.has(task.id) ? (
          <PlayPhaseSection
            title={task.title}
            variant="active"
            headerExtra={<PlayPhaseSectionBadge>{HOME.missionInProgress}</PlayPhaseSectionBadge>}
          >
            <p className={t.playPanelBody}>{task.description}</p>

            <div className="space-y-2">
              <p className={t.playPanelHint}>
                {HOME.selectItemsHint}
              </p>

              {group.acquired_items.length === 0 ? (
                <p className={cn(t.caption, "text-[var(--danger)] italic")}>
                  {HOME.noItemsToSubmit}
                </p>
              ) : (
                <ul className="space-y-2 rounded-lg border border-[var(--border)] bg-[var(--background)] p-2">
                  {group.acquired_items.map((a) => {
                    const isSelected = selectedItemIds.includes(a.itemId);
                    return (
                      <li key={a.itemId}>
                        <button
                          type="button"
                          onClick={() => handleToggleItem(a.itemId)}
                          className={cn(
                            playPhaseListRowClass,
                            isSelected
                              ? "border-[var(--primary)] bg-[color-mix(in_srgb,var(--primary)_8%,var(--card-bg))]"
                              : "border-[var(--border)]/60 bg-[var(--card-bg)] hover:border-[var(--border)]",
                          )}
                        >
                          {isSelected ? (
                            <CheckSquare className="h-3.5 w-3.5 shrink-0 text-[var(--primary)] @md:h-4 @md:w-4" />
                          ) : (
                            <Square className="h-3.5 w-3.5 shrink-0 text-[var(--muted-foreground)] @md:h-4 @md:w-4" />
                          )}
                          <span
                            className={cn(
                              "flex-1",
                              t.playPanelRow,
                              !isSelected && "font-normal text-[var(--muted-foreground)]",
                            )}
                          >
                            {itemNameById.get(a.itemId) ?? a.itemId}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className={playPhaseFormActions}>
              <Button
                type="button"
                className="@sm:min-w-[10rem]"
                onClick={handleCompleteTask}
                disabled={busy || selectedItemIds.length === 0}
              >
                {busy ? (
                  <>
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin @sm:h-4 @sm:w-4" aria-hidden />
                    {HOME.verifyingMission}
                  </>
                ) : selectedItemIds.length > 0 ? (
                  HOME.submitMission(selectedItemIds.length)
                ) : (
                  HOME.selectItemsButton
                )}
              </Button>
            </div>
          </PlayPhaseSection>
        ) : null}

        {!activityCompleted && canSubmitActivity ? (
          <PlayPhaseSection title={HOME.finalSection}>
            <p className={t.playPanelBody}>{HOME.finalReady}</p>
            <Button type="button" className="mt-3 w-full @sm:min-h-11" onClick={handleCompleteActivity} disabled={busy}>
              {busy ? (
                <>
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin @sm:h-4 @sm:w-4" aria-hidden />
                  {HOME.finalSubmitting}
                </>
              ) : (
                HOME.finalButton
              )}
            </Button>
          </PlayPhaseSection>
        ) : null}

        {activityCompleted ? (
          <PlayPhaseCallout title={HOME.finalDone} centered>
            <p className={t.playPanelCalloutBody}>{HOME.finalScore(groupScore)}</p>
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
