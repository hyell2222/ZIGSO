"use client";

import { Loader2, Puzzle } from "lucide-react";
import { useMemo, useState } from "react";

import { PlayPhaseShell } from "@/components/play/play-phase-shell";
import { PlayHeaderGroupPlace } from "@/components/play/play-header-group-place";
import { playSurfaceCool } from "@/components/play/play-atmosphere";
import { Button } from "@/components/ui/button";
import { completeTaskForGroup, completeActivityForGroup } from "@/lib/api/play";
import { groupHasItemsForTask, totalGroupScore } from "@/lib/activity-pack/engine";
import { taskCompleteMessage, PLAYER_MESSAGES } from "@/lib/activity-pack/player-messages";
import { PLAY_STUDENT_COPY } from "@/lib/play/student-copy";
import type { Task, ActivityPack } from "@/lib/activity-pack/types";
import type { GroupRow } from "@/lib/api/play";
import { cn } from "@/lib/utils";

type Props = {
  pack: ActivityPack;
  group: GroupRow;
  groupName: string | null;
  onUpdate: () => void;
  pending?: boolean;
  sandboxCompleteTask?: (taskId: string, steps: string[]) => void;
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
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(pack.tasks[0]?.id ?? null);
  const [selectedSteps, setSelectedSteps] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const task = pack.tasks.find((t) => t.id === selectedTaskId) ?? null;
  const completedIds = new Set(group.completed_tasks.map((m) => m.taskId));
  const acquiredIds = new Set(group.acquired_items.map((a) => a.itemId));
  const activityCompleted = Boolean(group.completed_at);
  const groupScore = totalGroupScore(group.acquired_items, group.completed_tasks);

  const availableCards = useMemo(() => {
    const pool = [...pack.actionCards];
    return pool.sort((a, b) => a.text.localeCompare(b.text));
  }, [pack.actionCards]);

  const toggleCard = (text: string) => {
    setSelectedSteps((prev) => {
      if (prev.includes(text)) return prev.filter((t) => t !== text);
      return [...prev, text];
    });
  };

  const handleCompleteTask = async () => {
    if (!selectedTaskId || !task) return;
    setMessage(null);
    setBusy(true);
    try {
      if (sandboxCompleteTask) {
        sandboxCompleteTask(selectedTaskId, selectedSteps);
      } else {
        await completeTaskForGroup({
          groupId: group.id,
          pack,
          taskId: selectedTaskId,
          submittedSteps: selectedSteps,
        });
      }
      setSelectedSteps([]);
      onUpdate();
      setMessage(taskCompleteMessage(task.name));
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

  const canSubmitTask = Boolean(task && !completedIds.has(task.id));
  const canSubmitActivity = !activityCompleted && completedIds.size >= pack.tasks.length;

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
                  {a.itemId.replace(/_/g, " ")} (+{a.score})
                </li>
              ))
            )}
          </ul>
        </section>

        <section>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--accent)] @sm:normal-case @sm:tracking-normal">
            모둠 과제
          </h3>
          <ul className="mt-2 space-y-2">
            {pack.tasks.map((m: Task) => {
              const done = completedIds.has(m.id);
              const canComplete = groupHasItemsForTask(group.acquired_items, m);
              return (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTaskId(m.id);
                      setSelectedSteps([]);
                      setMessage(null);
                    }}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition @md:text-base",
                      selectedTaskId === m.id
                        ? "border-[var(--primary)] bg-[var(--tint-accent-weak)]"
                        : "border-[var(--border)] hover:bg-[var(--tint-mystery)]",
                      done && "opacity-70",
                    )}
                  >
                    <Puzzle className="h-4 w-4 shrink-0 text-[var(--accent)]" aria-hidden />
                    <span className="flex-1 font-medium">{m.name}</span>
                    <span className="text-xs text-[var(--muted-foreground)] @md:text-sm">
                      {done ? "완료" : canComplete ? "진행 가능" : "항목 부족"}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        {task && !completedIds.has(task.id) ? (
          <section className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--accent)] @sm:normal-case @sm:tracking-normal">
              과제: {task.name}
            </h3>
            <p className="text-xs text-[var(--muted-foreground)] @md:text-sm">
              필요 항목:{" "}
              {task.itemIds
                .map((id) => (acquiredIds.has(id) ? id : `${id} (미획득)`))
                .join(", ")}
            </p>
            <div>
              <p className="mb-2 text-sm font-medium text-[var(--muted-foreground)] @md:text-sm">
                선택한 수행 순서
              </p>
              <ol className="list-decimal space-y-1 pl-5 text-sm @md:text-base">
                {selectedSteps.length === 0 ? (
                  <li className="text-[var(--muted-foreground)]">카드를 눌러 순서를 만드세요.</li>
                ) : (
                  selectedSteps.map((s, i) => (
                    <li key={`${i}-${s}`}>{s}</li>
                  ))
                )}
              </ol>
            </div>
            <div className="flex flex-wrap gap-2">
              {availableCards.map((card) => (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => toggleCard(card.text)}
                  className={cn(
                    "rounded-md border px-2 py-1.5 text-xs transition @md:text-sm",
                    selectedSteps.includes(card.text)
                      ? "border-[var(--primary)] bg-[var(--tint-accent-strong)] text-[var(--primary)]"
                      : "border-[var(--border)] hover:border-[var(--accent)]",
                  )}
                >
                  {card.text}
                </button>
              ))}
            </div>
            <div className="flex w-full flex-row flex-wrap items-center justify-between gap-2 pt-2 [&_button]:w-auto [&_button]:shrink-0">
              <Button type="button" variant="outline" onClick={() => setSelectedSteps([])}>
                순서 초기화
              </Button>
              <Button
                type="button"
                className="@sm:min-w-[10rem]"
                onClick={handleCompleteTask}
                disabled={busy || selectedSteps.length === 0}
              >
                {busy ? (
                  <>
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin @sm:h-4 @sm:w-4" aria-hidden />
                    처리 중…
                  </>
                ) : (
                  "과제 완성"
                )}
              </Button>
            </div>
          </section>
        ) : null}

        {!activityCompleted && canSubmitActivity ? (
          <section className="space-y-3 border-t border-[var(--border)] pt-4">
            <p className="text-sm text-[var(--muted-foreground)] @md:text-base">
              모든 과제를 완료했어요. 최종 제출을 눌러 주세요.
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
            <p className="text-sm font-bold text-[var(--primary)] @sm:text-lg">
              최종 제출 완료
            </p>
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
              message.includes("완료") ? "text-[var(--primary)]" : "text-[var(--danger)]",
            )}
          >
            {message}
          </p>
        ) : null}
      </div>
    </PlayPhaseShell>
  );
}
