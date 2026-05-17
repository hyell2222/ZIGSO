"use client";

import { Check, Circle, Loader2, Puzzle } from "lucide-react";
import { useMemo, useState } from "react";

import { PlayPhaseShell } from "@/components/play/play-phase-shell";
import { PlayHeaderGroupPlace } from "@/components/play/play-header-group-place";
import { playSurfaceCool } from "@/components/play/play-atmosphere";
import { Button } from "@/components/ui/button";
import { completeActivityForGroup, completeTaskForGroup } from "@/lib/api/play";
import {
  groupHasItemsForTask,
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
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const task = pack.tasks.find((c) => c.id === selectedTaskId) ?? null;
  const completedIds = new Set(group.completed_tasks.map((m) => m.taskId));
  const acquiredIds = new Set(group.acquired_items.map((a) => a.itemId));
  const activityCompleted = Boolean(group.completed_at);
  const groupScore = totalGroupScore(group.acquired_items, group.completed_tasks);

  const itemNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of pack.items) map.set(item.id, item.name);
    return map;
  }, [pack.items]);

  const taskProgress = task ? taskSubmissionProgress(group.acquired_items, task) : null;

  const requiredItems = useMemo(() => {
    if (!task) return [];
    return task.acceptedItemIds.map((itemId) => ({
      itemId,
      name: itemNameById.get(itemId) ?? itemId,
      acquired: acquiredIds.has(itemId),
    }));
  }, [task, itemNameById, acquiredIds]);

  const handleCompleteTask = async () => {
    if (!selectedTaskId || !task) return;
    setMessage(null);
    setBusy(true);
    const submittedItemIds = task.acceptedItemIds;
    try {
      if (sandboxCompleteTask) {
        sandboxCompleteTask(selectedTaskId, submittedItemIds);
      } else {
        await completeTaskForGroup({
          groupId: group.id,
          pack,
          taskId: selectedTaskId,
          submittedItemIds,
        });
      }
      onUpdate();
      setMessage(taskCompleteMessage(task.title, submittedItemIds.length * 3));
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

  const canSubmitTask = Boolean(
    task && !completedIds.has(task.id) && groupHasItemsForTask(group.acquired_items, task),
  );
  const canSubmitActivity =
    !activityCompleted && completedIds.size >= pack.tasks.length;

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
          />
        ),
      }}
      mainClassName="max-w-none w-full"
    >
      <div className={cn("space-y-4 px-4 py-4", playSurfaceCool, "@sm:space-y-6 @sm:px-5 @sm:py-6")}>
        <section>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--accent)] @sm:normal-case @sm:tracking-normal">
            모둠 항목
          </h3>
          <ul className="mt-2 flex flex-wrap gap-2">
            {group.acquired_items.length === 0 ? (
              <li className="text-sm text-[var(--muted-foreground)] @md:text-base">
                아직 획득한 항목이 없습니다.
              </li>
            ) : (
              group.acquired_items.map((a) => (
                <li
                  key={a.itemId}
                  className="rounded-full border border-[var(--border)] bg-[var(--tint-accent-weak)] px-3 py-1 text-xs @md:text-base"
                >
                  {itemNameById.get(a.itemId) ?? a.itemId} (+{a.score})
                </li>
              ))
            )}
          </ul>
        </section>

        <section>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--accent)] @sm:normal-case @sm:tracking-normal">
            해결할 미션
          </h3>
          <ul className="mt-2 space-y-2">
            {pack.tasks.map((ch) => {
              const done = completedIds.has(ch.id);
              const progress = taskSubmissionProgress(group.acquired_items, ch);
              const canComplete = progress.ready;
              return (
                <li key={ch.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTaskId(ch.id);
                      setMessage(null);
                    }}
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
                      {done
                        ? "완료"
                        : progress.required === 0
                          ? "항목 없음"
                          : canComplete
                            ? `제출 준비 (${progress.required}개)`
                            : `획득 ${progress.acquired}/${progress.required}`}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        {task && !completedIds.has(task.id) ? (
          <section className="space-y-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--accent)] @sm:normal-case @sm:tracking-normal">
                {task.title}
              </h3>
              {taskProgress && taskProgress.required > 0 ? (
                <p className="text-xs font-medium text-[var(--muted-foreground)] @md:text-sm">
                  필수 제출 {taskProgress.required}개 · 획득 {taskProgress.acquired}/
                  {taskProgress.required}
                </p>
              ) : null}
            </div>
            <p className="text-sm leading-relaxed text-[var(--muted-foreground)] @md:text-base">
              {task.description}
            </p>
            <p className="text-xs text-[var(--muted-foreground)] @md:text-sm">
              아래 항목을 <span className="font-medium text-[var(--foreground)]">모두</span> 획득한 뒤 한
              번에 제출하세요.
            </p>
            <ul className="space-y-2 rounded-lg border border-[var(--border)] bg-[var(--background)] p-2">
              {requiredItems.length === 0 ? (
                <li className="px-2 py-1.5 text-sm text-[var(--muted-foreground)]">
                  이 미션에 설정된 필수 제출 항목이 없습니다.
                </li>
              ) : (
                requiredItems.map(({ itemId, name, acquired }) => (
                  <li
                    key={itemId}
                    className={cn(
                      "flex items-center gap-2.5 rounded-md border px-3 py-2 text-sm @md:text-base",
                      acquired
                        ? "border-[color-mix(in_srgb,var(--primary)_35%,var(--border))] bg-[color-mix(in_srgb,var(--primary)_8%,var(--card-bg))]"
                        : "border-[var(--border)] bg-[var(--card-bg)]",
                    )}
                  >
                    {acquired ? (
                      <Check className="h-4 w-4 shrink-0 text-[var(--primary)]" aria-hidden />
                    ) : (
                      <Circle className="h-4 w-4 shrink-0 text-[var(--muted-foreground)]" aria-hidden />
                    )}
                    <span className={cn("flex-1 font-medium", !acquired && "text-[var(--muted-foreground)]")}>
                      {name}
                    </span>
                    <span className="text-xs text-[var(--muted-foreground)]">
                      {acquired ? "획득함" : "미획득"}
                    </span>
                  </li>
                ))
              )}
            </ul>
            <div className="flex w-full justify-end pt-2">
              <Button
                type="button"
                className="@sm:min-w-[10rem]"
                onClick={handleCompleteTask}
                disabled={busy || !canSubmitTask}
              >
                {busy ? (
                  <>
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin @sm:h-4 @sm:w-4" aria-hidden />
                    처리 중…
                  </>
                ) : taskProgress && taskProgress.required > 0 ? (
                  `미션 해결 (${taskProgress.required}개 제출)`
                ) : (
                  "미션 해결"
                )}
              </Button>
            </div>
          </section>
        ) : null}

        {!activityCompleted && canSubmitActivity ? (
          <section className="space-y-3 border-t border-[var(--border)] pt-4">
            <p className="text-sm text-[var(--muted-foreground)] @md:text-base">
              모든 미션을 해결했어요. 최종 제출을 눌러 주세요.
            </p>
            <Button type="button" className="w-full @sm:min-h-11" onClick={handleCompleteActivity} disabled={busy}>
              {busy ? (
                <>
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin @sm:h-4 @sm:w-4" aria-hidden />
                  제출 중…
                </>
              ) : (
                "최종 제출"
              )}
            </Button>
          </section>
        ) : null}

        {activityCompleted ? (
          <div className="rounded-lg border border-[color-mix(in_srgb,var(--primary)_35%,var(--border))] bg-[var(--tint-accent-weak)] p-4 text-center">
            <p className="text-sm font-bold text-[var(--primary)] @sm:text-lg">최종 제출 완료</p>
            <p className="mt-1 text-sm text-[var(--muted-foreground)] @md:text-base">
              모둠 점수: {groupScore}
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
