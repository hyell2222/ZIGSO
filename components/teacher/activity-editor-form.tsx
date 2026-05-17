"use client";

import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DIFFICULTY_UI_OPTIONS } from "@/lib/api/activities";
import {
  createEmptyItem,
  createEmptyTask,
  HINT_STAGE_LABELS,
  TASK_SLOT_LABELS,
  TASK_SLOTS,
  type EditorItem,
  type EditorTask,
  type TaskSlot,
  type ActivityEditorDraft,
} from "@/lib/activity-pack/activity-draft";

type Props = {
  draft: ActivityEditorDraft;
  onChange: (draft: ActivityEditorDraft) => void;
};

function FieldLabel({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="text-xs font-medium text-[var(--accent)]">
      {children}
    </label>
  );
}

function ItemEditor({
  item,
  taskLabel,
  onChange,
  onRemove,
  canRemove,
}: {
  item: EditorItem;
  taskLabel: string;
  onChange: (next: EditorItem) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  return (
    <div className="space-y-3 rounded-lg border border-[var(--border)] bg-[var(--background)] p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-[var(--foreground)]">맞출 항목</p>
        {canRemove ? (
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onRemove}>
            <Trash2 className="h-4 w-4" aria-hidden />
            <span className="sr-only">항목 삭제</span>
          </Button>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <FieldLabel htmlFor={`item-name-${item.localId}`}>정답 (전문가 집단)</FieldLabel>
          <Input
            id={`item-name-${item.localId}`}
            value={item.name}
            onChange={(e) => onChange({ ...item, name: e.target.value })}
            placeholder="예: 토마토"
          />
        </div>
        <div className="space-y-1.5">
          <FieldLabel htmlFor={`item-group-hint-${item.localId}`}>팀 공유 메모</FieldLabel>
          <Input
            id={`item-group-hint-${item.localId}`}
            value={item.groupHint}
            onChange={(e) => onChange({ ...item, groupHint: e.target.value })}
            placeholder="예: 팀에 전달할 짧은 안내"
          />
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-[var(--muted-foreground)]">
          추리 힌트 (전문가 집단 · {taskLabel})
        </p>
        {(Object.keys(HINT_STAGE_LABELS) as (keyof typeof HINT_STAGE_LABELS)[]).map((key) => (
          <div key={key} className="space-y-1">
            <FieldLabel htmlFor={`${item.localId}-${key}`}>{HINT_STAGE_LABELS[key]}</FieldLabel>
            <Textarea
              id={`${item.localId}-${key}`}
              rows={2}
              value={item.hints[key]}
              onChange={(e) =>
                onChange({
                  ...item,
                  hints: { ...item.hints, [key]: e.target.value },
                })
              }
              placeholder="힌트 문장"
              className="min-h-[3.5rem]"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function TaskEditorCard({
  task,
  onChange,
  onRemove,
  canRemove,
}: {
  task: EditorTask;
  onChange: (next: EditorTask) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const [open, setOpen] = useState(true);
  const slotLabel = TASK_SLOT_LABELS[task.slot];

  const updateItem = (localId: string, next: EditorItem) => {
    onChange({
      ...task,
      items: task.items.map((i) => (i.localId === localId ? next : i)),
    });
  };

  return (
    <article className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
      <header className="flex items-center gap-2 border-b border-[var(--border)] bg-[var(--tint-accent-weak)] px-4 py-3">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
          onClick={() => setOpen((v) => !v)}
        >
          <span className="rounded-md bg-[var(--primary)] px-2 py-0.5 text-xs font-semibold text-[var(--on-primary)]">
            {slotLabel}
          </span>
          <span className="truncate font-semibold text-[var(--foreground)]">
            {task.name.trim() || "과제 이름 없음"}
          </span>
          {open ? (
            <ChevronUp className="ml-auto h-4 w-4 shrink-0 text-[var(--muted-foreground)]" />
          ) : (
            <ChevronDown className="ml-auto h-4 w-4 shrink-0 text-[var(--muted-foreground)]" />
          )}
        </button>
        {canRemove ? (
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onRemove}>
            <Trash2 className="h-4 w-4" />
          </Button>
        ) : null}
      </header>

      {open ? (
        <div className="space-y-6 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <FieldLabel htmlFor={`task-name-${task.localId}`}>과제 이름</FieldLabel>
              <Input
                id={`task-name-${task.localId}`}
                value={task.name}
                onChange={(e) => onChange({ ...task, name: e.target.value })}
                placeholder="예: 사건 개요 정리"
              />
            </div>
            <div className="space-y-1.5">
              <FieldLabel htmlFor={`task-slot-${task.localId}`}>주제 칸</FieldLabel>
              <select
                id={`task-slot-${task.localId}`}
                value={task.slot}
                onChange={(e) => onChange({ ...task, slot: e.target.value as TaskSlot })}
                className="h-10 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm"
              >
                {TASK_SLOTS.map((slot) => (
                  <option key={slot} value={slot}>
                    {TASK_SLOT_LABELS[slot]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-[var(--foreground)]">맞출 항목 & 힌트</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  onChange({
                    ...task,
                    items: [...task.items, createEmptyItem()],
                  })
                }
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                항목 추가
              </Button>
            </div>
            <div className="space-y-3">
              {task.items.map((entry) => (
                <ItemEditor
                  key={entry.localId}
                  item={entry}
                  taskLabel={task.name.trim() || slotLabel}
                  onChange={(next) => updateItem(entry.localId, next)}
                  onRemove={() =>
                    onChange({
                      ...task,
                      items: task.items.filter((i) => i.localId !== entry.localId),
                    })
                  }
                  canRemove={task.items.length > 1}
                />
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-[var(--foreground)]">수행 순서</h3>
                <p className="text-xs text-[var(--muted-foreground)]">
                  순서대로 입력하세요. 학생이 카드로 조합합니다.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onChange({ ...task, steps: [...task.steps, ""] })}
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                단계 추가
              </Button>
            </div>
            <ol className="space-y-2">
              {task.steps.map((step, idx) => (
                <li key={`${task.localId}-step-${idx}`} className="flex gap-2">
                  <span className="mt-2.5 w-6 shrink-0 text-center text-xs font-mono text-[var(--muted-foreground)]">
                    {idx + 1}
                  </span>
                  <Input
                    value={step}
                    onChange={(e) => {
                      const steps = [...task.steps];
                      steps[idx] = e.target.value;
                      onChange({ ...task, steps });
                    }}
                    placeholder="예: 단서를 팀에 공유한다"
                    className="flex-1"
                  />
                  <div className="flex shrink-0 flex-col gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      disabled={idx === 0}
                      onClick={() => {
                        const steps = [...task.steps];
                        [steps[idx - 1], steps[idx]] = [steps[idx]!, steps[idx - 1]!];
                        onChange({ ...task, steps });
                      }}
                      aria-label="위로"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      disabled={idx === task.steps.length - 1}
                      onClick={() => {
                        const steps = [...task.steps];
                        [steps[idx], steps[idx + 1]] = [steps[idx + 1]!, steps[idx]!];
                        onChange({ ...task, steps });
                      }}
                      aria-label="아래로"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    disabled={task.steps.length <= 1}
                    onClick={() =>
                      onChange({
                        ...task,
                        steps: task.steps.filter((_, i) => i !== idx),
                      })
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ol>
          </section>
        </div>
      ) : null}
    </article>
  );
}

export function ActivityEditorForm({ draft, onChange }: Props) {
  const updateTask = (localId: string, next: EditorTask) => {
    onChange({
      ...draft,
      tasks: draft.tasks.map((t) => (t.localId === localId ? next : t)),
    });
  };

  const usedSlots = new Set(draft.tasks.map((t) => t.slot));
  const nextFreeSlot = TASK_SLOTS.find((s) => !usedSlots.has(s));

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <h2 className="text-sm font-semibold text-[var(--foreground)]">활동 설정</h2>
        <p className="mt-1 text-xs text-[var(--muted-foreground)]">
          팀 규모와 난이도를 조정하세요.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <FieldLabel>팀 인원</FieldLabel>
            <Input
              type="number"
              min={2}
              max={12}
              value={draft.groupSize}
              onChange={(e) =>
                onChange({
                  ...draft,
                  groupSize: Math.min(12, Math.max(2, Number(e.target.value) || 4)),
                })
              }
            />
          </div>
          <div className="space-y-1.5">
            <FieldLabel>난이도</FieldLabel>
            <select
              value={draft.difficulty}
              onChange={(e) =>
                onChange({
                  ...draft,
                  difficulty: e.target.value as ActivityEditorDraft["difficulty"],
                })
              }
              className="h-10 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm"
            >
              {DIFFICULTY_UI_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-[var(--foreground)]">과제 구성</h2>
            <p className="text-sm text-[var(--muted-foreground)]">
              과제별 맞출 항목(5단계 힌트)과 수행 순서를 작성하세요.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!nextFreeSlot}
            onClick={() => {
              if (!nextFreeSlot) return;
              onChange({
                ...draft,
                tasks: [...draft.tasks, createEmptyTask(nextFreeSlot)],
              });
            }}
          >
            <Plus className="mr-1 h-4 w-4" />
            과제 추가
          </Button>
        </div>

        <div className="space-y-4">
          {draft.tasks.map((task) => (
            <TaskEditorCard
              key={task.localId}
              task={task}
              onChange={(next) => updateTask(task.localId, next)}
              onRemove={() =>
                onChange({
                  ...draft,
                  tasks: draft.tasks.filter((t) => t.localId !== task.localId),
                })
              }
              canRemove={draft.tasks.length > 1}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
