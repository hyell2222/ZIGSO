"use client";

import { Check, Circle, Loader2, Puzzle, CheckSquare, Square } from "lucide-react";
import { useMemo, useState, useEffect } from "react";

import { PlayPhaseShell } from "@/components/play/play-phase-shell";
import { PlayHeaderGroupPlace } from "@/components/play/play-header-group-place";
import {
  activityCallout,
  activityEmptyState,
  activityPanelCard,
  activityStackTight,
} from "@/components/activity/activity-layout-chrome";
import { activityLayoutType } from "@/components/activity/activity-layout-typography";
import { Button } from "@/components/ui/button";
import { completeActivityForGroup, completeTaskForGroup } from "@/lib/api/play";
import {
  taskSubmissionProgress,
  totalGroupScore,
} from "@/lib/activity-pack/engine";
import { taskCompleteMessage, PLAYER_MESSAGES } from "@/lib/activity-pack/player-messages";
import { PLAY_STUDENT_COPY } from "@/lib/play/student-copy";
import type { ActivityPack } from "@/lib/activity-pack/types";
import type { GroupRow } from "@/lib/api/play";
import { cn } from "@/lib/utils";

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
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
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
      setMessage("활동을 완료했습니다! 잘하셨습니다.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : PLAYER_MESSAGES.operationFailed);
    } finally {
      setBusy(false);
    }
  };

  const canSubmitActivity =
    !activityCompleted && completedIds.size >= pack.tasks.length;

  const sectionHeadingClass = activityLayoutType.panelSectionTitle;

  return (
    <PlayPhaseShell
      contained={contained}
      header={{
        phase: 3,
        title: PLAY_STUDENT_COPY.phaseHome.title,
        description: PLAY_STUDENT_COPY.phaseHome.description,
        rightSlot: (
          <PlayHeaderGroupPlace
            groupName={groupName}
            placeName={`${groupScore}점`}
            placeLabel={PLAY_STUDENT_COPY.phaseHome.scoreLabel}
            pending={pending}
            contained={contained}
          />
        ),
      }}
      mainClassName="max-w-none w-full"
    >
      <div className={activityPanelCard}>
        <section>
          <h3 className={sectionHeadingClass}>모둠이 모아온 모든 단서</h3>
          {group.acquired_items.length === 0 ? (
            <div className={cn("mt-3", activityEmptyState)}>
              <p className="text-sm text-[var(--muted-foreground)]">
                아직 모둠원들이 얻은 단서가 아무것도 없습니다.
              </p>
              <p className="mt-1 text-xs text-[var(--muted-foreground)]/70">
                정답을 추리하기 위해 먼저 단서를 찾아오세요!
              </p>
            </div>
          ) : (
            <ul className="mt-2 flex flex-wrap gap-2">
              {group.acquired_items.map((a) => (
                <li
                  key={a.itemId}
                  className="rounded-full border border-[var(--border)] bg-[var(--tint-accent-weak)] px-3 py-1 text-xs font-medium text-[var(--foreground)] @md:text-sm"
                >
                  🔍 {itemNameById.get(a.itemId) ?? a.itemId} (+{a.score}점)
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h3 className={sectionHeadingClass}>해결할 미션 목록</h3>
          <ul className="mt-2 space-y-2">
            {pack.tasks.map((ch) => {
              const done = completedIds.has(ch.id);
              const progress = taskSubmissionProgress(group.acquired_items, ch);
              return (
                <li key={ch.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedTaskId(ch.id)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition @md:text-base",
                      selectedTaskId === ch.id
                        ? "border-[var(--primary)] bg-[var(--tint-accent-weak)]"
                        : "border-[var(--border)] hover:bg-[var(--tint-mystery)]",
                      done && "opacity-70",
                    )}
                  >
                    <Puzzle className="h-4 w-4 shrink-0 text-[var(--accent)]" aria-hidden />
                    <span className="min-w-0 flex-1 font-medium">{ch.title}</span>
                    <span className="shrink-0 text-xs text-[var(--muted-foreground)] @md:text-sm">
                      {done ? "완료됨" : "도전 중"}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        {task && !completedIds.has(task.id) ? (
          <section className={activityStackTight}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className={sectionHeadingClass}>{task.title}</h3>
            </div>
            <p className="text-sm leading-relaxed text-[var(--muted-foreground)] @md:text-base">
              {task.description}
            </p>
            
            <div className="space-y-2">
              <p className="text-xs font-semibold text-[var(--foreground)] @md:text-sm">
                이 미션의 정답이라고 생각하는 단서를 아래에서 선택하세요:
              </p>
              
              {group.acquired_items.length === 0 ? (
                <p className="text-xs text-[var(--danger)] italic">
                  제출할 수 있는 단서가 없습니다. 먼저 단서를 모아오세요.
                </p>
              ) : (
                <ul className="space-y-2 rounded-xl border border-[var(--border)] bg-[var(--background)] p-2">
                  {group.acquired_items.map((a) => {
                    const isSelected = selectedItemIds.includes(a.itemId);
                    return (
                      <li key={a.itemId}>
                        <button
                          type="button"
                          onClick={() => handleToggleItem(a.itemId)}
                          className={cn(
                            "flex w-full items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm text-left transition-all @md:text-base",
                            isSelected
                              ? "border-[var(--primary)] bg-[color-mix(in_srgb,var(--primary)_8%,var(--card-bg))]"
                              : "border-[var(--border)]/60 bg-[var(--card-bg)] hover:border-[var(--border)]"
                          )}
                        >
                          {isSelected ? (
                            <CheckSquare className="h-4 w-4 shrink-0 text-[var(--primary)]" />
                          ) : (
                            <Square className="h-4 w-4 shrink-0 text-[var(--muted-foreground)]" />
                          )}
                          <span className={cn(
                            "flex-1 font-medium",
                            isSelected ? "text-[var(--foreground)]" : "text-[var(--muted-foreground)]"
                          )}>
                            {itemNameById.get(a.itemId) ?? a.itemId}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="flex w-full justify-end pt-2">
              <Button
                type="button"
                className="@sm:min-w-[10rem]"
                onClick={handleCompleteTask}
                disabled={busy || selectedItemIds.length === 0}
              >
                {busy ? (
                  <>
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin @sm:h-4 @sm:w-4" aria-hidden />
                    정답 확인 중…
                  </>
                ) : selectedItemIds.length > 0 ? (
                  `선택한 단서 ${selectedItemIds.length}개로 정답 제출`
                ) : (
                  "단서를 선택해 주세요"
                )}
              </Button>
            </div>
          </section>
        ) : null}

        {!activityCompleted && canSubmitActivity ? (
          <section className="space-y-3 border-t border-[var(--border)] pt-4">
            <p className="text-sm text-[var(--muted-foreground)] @md:text-base">
              모든 미션을 완료했습니다! 최종 결과를 제출해 주세요.
            </p>
            <Button type="button" className="w-full @sm:min-h-11" onClick={handleCompleteActivity} disabled={busy}>
              {busy ? (
                <>
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin @sm:h-4 @sm:w-4" aria-hidden />
                  제출 중…
                </>
              ) : (
                "최종 결과 제출"
              )}
            </Button>
          </section>
        ) : null}

        {activityCompleted ? (
          <div className={cn(activityCallout, "text-center")}>
            <p className="text-sm font-bold text-[var(--primary)] @sm:text-lg">최종 제출 완료</p>
            <p className="mt-1 text-sm text-[var(--muted-foreground)] @md:text-base">
              모둠 최종 점수: {groupScore}점
            </p>
            <p className="mt-4 text-xs text-[var(--muted-foreground)] @md:text-sm">
              {PLAY_STUDENT_COPY.waiting.waitForTeacher}
            </p>
          </div>
        ) : null}

        {message ? (
          <p
            className={cn(
              "text-sm @md:text-base",
              message.includes("해결") || message.includes("완료")
                ? "text-[var(--primary)]"
                : "text-[var(--danger)]",
            )}
          >
            {message}
          </p>
        ) : null}
      </div>
    </PlayPhaseShell>
  );
}