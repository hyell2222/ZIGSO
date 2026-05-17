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
  embedded?: boolean;
};

export function GroupPhasePanel({
  pack,
  group,
  groupName,
  onUpdate,
  pending,
  sandboxCompleteTask,
  sandboxCompleteActivity,
  embedded = false,
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
      embedded={embedded}
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
            compact={embedded}
          />
        ),
      }}
      mainClassName="max-w-none w-full"
    >
      <div className={cn("space-y-6 px-5 py-6", playSurfaceCool)}>
        <section>
          <h3 className="text-sm font-semibold text-[var(--accent)]">모둠 항목</h3>
          <ul className="mt-2 flex flex-wrap gap-2">
            {group.acquired_items.length === 0 ? (
              <li className="text-sm text-[var(--muted-foreground)]">아직 획득한 항목이 없습니다.</li>
            ) : (
              group.acquired_items.map((a) => (
                <li
                  key={a.itemId}
                  className="rounded-full border border-[var(--border)] bg-[var(--tint-accent-weak)] px-3 py-1 text-sm"
                >
                  {a.itemId.replace(/_/g, " ")} (+{a.score})
                </li>
              ))
            )}
          </ul>
        </section>

        <section>
          <h3 className="text-sm font-semibold text-[var(--accent)]">모둠 과제</h3>
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
                      "flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition",
                      selectedTaskId === m.id
                        ? "border-[var(--primary)] bg-[var(--tint-accent-weak)]"
                        : "border-[var(--border)] hover:bg-[var(--tint-mystery)]",
                      done && "opacity-70",
                    )}
                  >
                    <Puzzle className="h-4 w-4 shrink-0 text-[var(--accent)]" aria-hidden />
                    <span className="flex-1 font-medium">{m.name}</span>
                    <span className="text-xs text-[var(--muted-foreground)]">
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
            <h3 className="text-sm font-semibold text-[var(--accent)]">과제: {task.name}</h3>
            <p className="text-xs text-[var(--muted-foreground)]">
              필요 항목:{" "}
              {task.itemIds
                .map((id) => (acquiredIds.has(id) ? id : `${id} (미획득)`))
                .join(", ")}
            </p>
            <div>
              <p className="mb-2 text-xs font-medium text-[var(--muted-foreground)]">선택한 수행 순서</p>
              <ol className="list-decimal space-y-1 pl-5 text-sm">
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
                    "rounded-md border px-2 py-1.5 text-xs transition",
                    selectedSteps.includes(card.text)
                      ? "border-[var(--primary)] bg-[var(--tint-accent-strong)] text-[var(--primary)]"
                      : "border-[var(--border)] hover:border-[var(--accent)]",
                  )}
                >
                  {card.text}
                </button>
              ))}
            </div>
            <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => setSelectedSteps([])}>
                순서 초기화
              </Button>
              <Button
                type="button"
                className="w-full sm:min-w-[10rem] sm:w-auto"
                onClick={handleCompleteTask}
                disabled={busy || selectedSteps.length === 0}
              >
                {busy ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
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
            <p className="text-sm text-[var(--muted-foreground)]">모든 과제를 완료했어요. 최종 제출을 눌러 주세요.</p>
            <Button type="button" className="w-full" size="lg" onClick={handleCompleteActivity} disabled={busy}>
              {busy ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
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
            <p className="text-lg font-bold text-[var(--primary)]">최종 제출 완료</p>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">모둠 점수: {groupScore}</p>
            <p className="mt-4 text-xs text-[var(--muted-foreground)]">{PLAY_STUDENT_COPY.waiting.waitForTeacher}</p>
          </div>
        ) : null}

        {message ? (
          <p
            className={cn(
              "text-sm",
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
