"use client";

import { Plus, Trash2 } from "lucide-react";
import { useEffect, useId, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { FormField, formLabelClass } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  createEmptyTask,
  createEmptyItem,
  createEmptyRole,
  derivedActivityScale,
  editorItemLabel,
  editorRoleLabel,
  flattenEditorItems,
  HINT_STAGE_LABELS,
  MAX_ITEMS_PER_ROLE,
  MAX_ROLES_PER_GROUP,
  MIN_ITEMS_PER_ROLE,
  MIN_ROLES_PER_GROUP,
  type EditorTask,
  type EditorItem,
  type EditorRole,
  type FlatEditorItem,
  type ActivityEditorDraft,
  type EditorStepId,
} from "@/lib/activity-pack/activity-draft";
import { cn } from "@/lib/utils";

type Props = {
  draft: ActivityEditorDraft;
  onChange: (draft: ActivityEditorDraft) => void;
  step: EditorStepId;
};

const HINT_KEYS = Object.keys(HINT_STAGE_LABELS) as (keyof typeof HINT_STAGE_LABELS)[];

const HINT_SHORT_LABELS: Record<keyof typeof HINT_STAGE_LABELS, string> = {
  stage1: "1단계 (5점)",
  stage2: "2단계 (4점)",
  stage3: "3단계 (3점)",
  stage4: "4단계 (2점)",
  stage5: "5단계 (1점)",
};

const editorPanelClass =
  "overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card-bg)] text-[var(--foreground)] shadow-[0_20px_50px_-12px_color-mix(in_srgb,var(--primary)_18%,transparent)]";

function EditorCard({
  children,
  className,
  bodyClassName,
  indexTabs,
}: {
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  indexTabs?: ReactNode;
}) {
  if (indexTabs) {
    return (
      <div className={cn("flex w-full min-w-0 flex-col", className)}>
        <div className="hidden shrink-0 sm:block">{indexTabs}</div>
        <article className={cn(editorPanelClass, "rounded-tl-none")}>
          <div className={cn("min-w-0 space-y-5 px-4 py-4 sm:px-5 sm:py-5", bodyClassName)}>{children}</div>
        </article>
      </div>
    );
  }

  return (
    <article className={cn(editorPanelClass, className)}>
      <div className={cn("min-w-0 space-y-5 px-4 py-4 sm:px-5 sm:py-5", bodyClassName)}>{children}</div>
    </article>
  );
}

function RoleIndexTabs({
  tabs,
  activeIndex,
  onSelect,
}: {
  tabs: { key: string; label: string }[];
  activeIndex: number;
  onSelect: (index: number) => void;
}) {
  return (
    <div
      className="flex min-w-0 items-end gap-1 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      role="tablist"
    >
      {tabs.map((tab, index) => {
        const isActive = index === activeIndex;
        const isFirst = index === 0;
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onSelect(index)}
            className={cn(
              "relative shrink-0 cursor-pointer border-x border-t border-[var(--border)] px-4 text-sm font-semibold",
              "rounded-t-[10px] transition-none active:scale-100 active:transform-none",
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring-focus)]",
              isActive
                ? "z-10 -mb-px border-b-[var(--card-bg)] bg-[var(--card-bg)] py-2.5 text-[var(--foreground)]"
                : "z-0 bg-[color-mix(in_srgb,var(--background)_82%,var(--card-bg))] py-2 text-[var(--muted-foreground)] hover:bg-[color-mix(in_srgb,var(--background)_65%,var(--card-bg))] hover:text-[var(--foreground)]",
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

function EditorBlock({
  title,
  actions,
  children,
  className,
}: {
  title?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-4", className)}>
      {title || actions ? (
        <div className="flex items-center justify-between gap-3">
          {title ? <p className={formLabelClass}>{title}</p> : <span className="min-w-0 flex-1" />}
          {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </div>
  );
}

function EditorTabBar({
  tabs,
  activeIndex,
  onSelect,
  trailing,
  compact = false,
  embedded = false,
  appearance = "tab",
}: {
  tabs: { key: string; label: string }[];
  activeIndex: number;
  onSelect: (index: number) => void;
  trailing?: ReactNode;
  compact?: boolean;
  embedded?: boolean;
  appearance?: "tab" | "chip";
}) {
  const isChip = appearance === "chip";

  const tabList = (
    <div
      className={cn(
        "flex min-w-0",
        isChip
          ? "flex-wrap gap-2"
          : "gap-0 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
      )}
      role="tablist"
    >
      {tabs.map((tab, index) => {
        const isActive = index === activeIndex;
        return (
          <Button
            key={tab.key}
            type="button"
            role="tab"
            variant={isChip ? "chip" : "tab"}
            size={compact || isChip ? "sm" : "default"}
            aria-selected={isActive}
            onClick={() => onSelect(index)}
            className={cn(
              "shrink-0",
              !isChip && (compact ? "px-3" : "px-4"),
              isChip &&
                isActive &&
                "border-[var(--primary)] bg-[color-mix(in_srgb,var(--primary)_12%,var(--background))] text-[var(--foreground)]",
              !isChip &&
                isActive &&
                "border-[var(--primary)]! text-[var(--foreground)]!",
            )}
          >
            {tab.label}
          </Button>
        );
      })}
    </div>
  );

  if (embedded && !trailing) {
    return tabList;
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between",
        embedded && !isChip && "sm:px-1",
        embedded && isChip && "sm:px-1 sm:pt-1",
      )}
    >
      <div className="min-w-0 flex-1">
        {tabList}
      </div>
      {trailing ? (
        <div className="flex shrink-0 flex-wrap gap-2 px-2 pb-2 sm:px-0 sm:pb-0">{trailing}</div>
      ) : null}
    </div>
  );
}

function ItemEditorBody({
  item,
  onChange,
}: {
  item: EditorItem;
  onChange: (next: EditorItem) => void;
}) {
  return (
    <>
      <FormField label="정답" htmlFor={`item-name-${item.localId}`}>
        <Input
          id={`item-name-${item.localId}`}
          value={item.name}
          onChange={(e) => onChange({ ...item, name: e.target.value })}
          placeholder="예: 부스 운영 매뉴얼"
        />
      </FormField>

      <div className="space-y-1.5 border-t border-[var(--border)] pt-4">
        <div>
          <p className={formLabelClass}>추리 힌트</p>
          <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">1단계가 가장 어렵습니다</p>
        </div>
        <div className="space-y-3">
          {HINT_KEYS.map((key) => (
            <FormField
              key={key}
              label={HINT_SHORT_LABELS[key]}
              htmlFor={`${item.localId}-${key}`}
            >
              <Input
                id={`${item.localId}-${key}`}
                value={item.hints[key]}
                onChange={(e) =>
                  onChange({
                    ...item,
                    hints: { ...item.hints, [key]: e.target.value },
                  })
                }
                placeholder="힌트 문장"
              />
            </FormField>
          ))}
        </div>
      </div>
    </>
  );
}

function TaskBlock({
  task,
  index,
  flatItems,
  onChange,
  onRemove,
  canRemove,
}: {
  task: EditorTask;
  index: number;
  flatItems: FlatEditorItem[];
  onChange: (next: EditorTask) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const toggleItem = (localId: string) => {
    const has = task.acceptedItemIds.includes(localId);
    const acceptedItemIds = has
      ? task.acceptedItemIds.filter((id) => id !== localId)
      : [...task.acceptedItemIds, localId];
    const min = task.minimumItems ?? 1;
    onChange({
      ...task,
      acceptedItemIds,
      minimumItems: Math.min(min, acceptedItemIds.length || 1),
    });
  };

  return (
    <EditorBlock
      title={`과제 ${index + 1}`}
      className={index > 0 ? "border-t border-[var(--border)] pt-5" : undefined}
      actions={
        canRemove ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 text-[var(--muted-foreground)]"
            onClick={onRemove}
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            삭제
          </Button>
        ) : null
      }
    >
      <div className="grid gap-5 lg:grid-cols-2">
        <FormField label="제목" htmlFor={`task-title-${task.localId}`}>
          <Input
            id={`task-title-${task.localId}`}
            value={task.title}
            onChange={(e) => onChange({ ...task, title: e.target.value })}
            placeholder="예: 부스 개점 준비"
          />
        </FormField>
        <FormField label="최소 선택 아이템 수" htmlFor={`task-min-${task.localId}`}>
          <Input
            id={`task-min-${task.localId}`}
            type="number"
            min={1}
            max={Math.max(1, task.acceptedItemIds.length)}
            className="max-w-[7rem]"
            value={task.minimumItems ?? 1}
            onChange={(e) =>
              onChange({
                ...task,
                minimumItems: Math.max(
                  1,
                  Math.min(task.acceptedItemIds.length || 1, Number(e.target.value) || 1),
                ),
              })
            }
          />
        </FormField>
      </div>

      <FormField label="설명" htmlFor={`task-desc-${task.localId}`}>
        <Textarea
          id={`task-desc-${task.localId}`}
          rows={3}
          value={task.description}
          onChange={(e) => onChange({ ...task, description: e.target.value })}
          placeholder="모둠이 해결할 상황을 설명하세요."
        />
      </FormField>

      <FormField label="사용 가능한 아이템" help="이 과제에서 제출할 수 있는 맞출 아이템입니다.">
        <ul className={cn("grid gap-2 sm:grid-cols-2", "rounded-lg border border-[var(--border)] bg-[var(--background)] p-2 shadow-[var(--input-inset)]")}>
          {flatItems.map(({ item, roleLabel }, idx) => {
            const checked = task.acceptedItemIds.includes(item.localId);
            const inputId = `task-item-${task.localId}-${item.localId}`;
            const label = item.name.trim()
              ? `${roleLabel} · ${item.name.trim()}`
              : `${roleLabel} · 아이템 ${idx + 1}`;
            return (
              <li key={item.localId}>
                <label htmlFor={inputId} className="flex cursor-pointer items-center gap-2.5 rounded-md border border-[var(--border)] bg-[var(--background)] px-2.5 py-2 transition-colors has-[:checked]:border-[color-mix(in_srgb,var(--primary)_35%,var(--border))] has-[:checked]:bg-[color-mix(in_srgb,var(--primary)_10%,var(--card-bg))] hover:border-[color-mix(in_srgb,var(--accent)_30%,var(--border))]">
                  <input
                    id={inputId}
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleItem(item.localId)}
                    className="h-4 w-4 shrink-0 accent-[var(--primary)]"
                  />
                  <span className="truncate text-sm">{label}</span>
                </label>
              </li>
            );
          })}
        </ul>
      </FormField>
    </EditorBlock>
  );
}

function BasicsStepBody({
  draft,
  onChange,
}: {
  draft: ActivityEditorDraft;
  onChange: (draft: ActivityEditorDraft) => void;
}) {
  return (
    <>
      <FormField label="제목" htmlFor="activity-title">
        <Input
          id="activity-title"
          value={draft.title}
          onChange={(e) => onChange({ ...draft, title: e.target.value })}
          placeholder="예: 학교 축제 부스 운영"
        />
      </FormField>
      <FormField label="설명" htmlFor="activity-desc">
        <Textarea
          id="activity-desc"
          rows={4}
          value={draft.description}
          onChange={(e) => onChange({ ...draft, description: e.target.value })}
          placeholder="내일은 학교 축제입니다. 여러 과제를 해결하며…"
        />
      </FormField>
    </>
  );
}

function updateRoleInDraft(
  draft: ActivityEditorDraft,
  roleLocalId: string,
  updater: (role: EditorRole) => EditorRole,
): ActivityEditorDraft {
  return {
    ...draft,
    roles: draft.roles.map((r) => (r.localId === roleLocalId ? updater(r) : r)),
  };
}

export function ActivityEditorForm({ draft, onChange, step }: Props) {
  const [roleIndex, setRoleIndex] = useState(0);
  const [itemIndex, setItemIndex] = useState(0);

  const activeRole = draft.roles[roleIndex];
  const activeItem = activeRole?.items[itemIndex];
  const flatItems = flattenEditorItems(draft);
  const maxItemsPerRole = Math.max(0, ...draft.roles.map((r) => r.items.length));
  const roleSelectId = useId();
  const itemSelectId = useId();

  useEffect(() => {
    if (roleIndex >= draft.roles.length) {
      setRoleIndex(Math.max(0, draft.roles.length - 1));
    }
  }, [draft.roles.length, roleIndex]);

  useEffect(() => {
    const role = draft.roles[roleIndex];
    if (!role) return;
    if (itemIndex >= role.items.length) {
      setItemIndex(Math.max(0, role.items.length - 1));
    }
  }, [draft.roles, roleIndex, itemIndex]);

  useEffect(() => {
    setItemIndex(0);
  }, [roleIndex]);

  const updateTask = (localId: string, next: EditorTask) => {
    onChange({
      ...draft,
      tasks: draft.tasks.map((t) => (t.localId === localId ? next : t)),
    });
  };

  if (step === "basics") {
    return (
      <EditorCard>
        <BasicsStepBody draft={draft} onChange={onChange} />
      </EditorCard>
    );
  }

  if (step === "items") {
    if (draft.roles.length === 0) {
      return (
        <EditorCard>
          <div className="flex flex-col items-center gap-3 py-6 text-center text-sm text-[var(--muted-foreground)]">
            <p>역할이 없습니다.</p>
            <Button type="button" onClick={() => onChange({ ...draft, roles: [createEmptyRole()] })}>
              <Plus className="mr-1.5 h-4 w-4" />
              첫 역할 추가
            </Button>
          </div>
        </EditorCard>
      );
    }

    const roleOptions = draft.roles.map((role, index) => ({
      key: role.localId,
      label: editorRoleLabel(index),
    }));
    const itemOptions =
      activeRole?.items.map((item, index) => ({
        key: item.localId,
        label: editorItemLabel(index),
      })) ?? [];

    const removeActiveRole = () => {
      if (!activeRole) return;
      const removedIds = new Set(activeRole.items.map((i) => i.localId));
      onChange({
        ...draft,
        roles: draft.roles.filter((r) => r.localId !== activeRole.localId),
        tasks: draft.tasks.map((task) => ({
          ...task,
          acceptedItemIds: task.acceptedItemIds.filter((id) => !removedIds.has(id)),
        })),
      });
    };

    const roleTabActions = (
      <>
        {draft.roles.length < MAX_ROLES_PER_GROUP ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              onChange({ ...draft, roles: [...draft.roles, createEmptyRole()] });
              setRoleIndex(draft.roles.length);
            }}
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            역할 추가
          </Button>
        ) : null}
        {draft.roles.length > MIN_ROLES_PER_GROUP ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-[var(--muted-foreground)]"
            onClick={removeActiveRole}
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            역할 삭제
          </Button>
        ) : null}
      </>
    );

    return (
      activeRole && activeItem ? (
        <EditorCard
          indexTabs={
            <div className="flex items-end justify-between gap-3">
              <RoleIndexTabs tabs={roleOptions} activeIndex={roleIndex} onSelect={setRoleIndex} />
              <div className="mb-px flex shrink-0 flex-wrap justify-end gap-2 pb-1">{roleTabActions}</div>
            </div>
          }
        >
          <div className="space-y-5">
            <div className="space-y-3 sm:hidden">
              <FormField label="편집할 역할" htmlFor={roleSelectId}>
                <select
                  id={roleSelectId}
                  value={roleIndex}
                  onChange={(e) => setRoleIndex(Number(e.target.value))}
                  className="h-10 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] shadow-[var(--input-inset)] placeholder:text-[var(--muted-foreground)] focus:border-[var(--mystery)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--ring-focus)]"
                >
                  {roleOptions.map((opt, index) => (
                    <option key={opt.key} value={index}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </FormField>
              <div className="flex flex-wrap gap-2">{roleTabActions}</div>
              <FormField label="맞출 아이템" htmlFor={itemSelectId}>
                <select
                  id={itemSelectId}
                  value={itemIndex}
                  onChange={(e) => setItemIndex(Number(e.target.value))}
                  className="h-10 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] shadow-[var(--input-inset)] placeholder:text-[var(--muted-foreground)] focus:border-[var(--mystery)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--ring-focus)]"
                >
                  {itemOptions.map((opt, index) => (
                    <option key={opt.key} value={index}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </FormField>
              {activeRole.items.length < MAX_ITEMS_PER_ROLE ? (
                <Button
                  type="button"
                  variant="chip"
                  size="sm"
                  onClick={() => {
                    onChange(
                      updateRoleInDraft(draft, activeRole.localId, (role) => ({
                        ...role,
                        items: [...role.items, createEmptyItem()],
                      })),
                    );
                    setItemIndex(activeRole.items.length);
                  }}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  아이템 추가
                </Button>
              ) : null}
            </div>
            <div className="hidden sm:block">
              <EditorTabBar
                tabs={itemOptions}
                activeIndex={itemIndex}
                onSelect={setItemIndex}
                appearance="chip"
                compact
                embedded
                trailing={
                  activeRole.items.length < MAX_ITEMS_PER_ROLE ? (
                    <Button
                      type="button"
                      variant="chip"
                      size="sm"
                      onClick={() => {
                        onChange(
                          updateRoleInDraft(draft, activeRole.localId, (role) => ({
                            ...role,
                            items: [...role.items, createEmptyItem()],
                          })),
                        );
                        setItemIndex(activeRole.items.length);
                      }}
                    >
                      <Plus className="mr-1 h-3.5 w-3.5" />
                      아이템 추가
                    </Button>
                  ) : null
                }
              />
            </div>
            <ItemEditorBody
              item={activeItem}
              onChange={(next) =>
                onChange(
                  updateRoleInDraft(draft, activeRole.localId, (role) => ({
                    ...role,
                    items: role.items.map((i) => (i.localId === activeItem.localId ? next : i)),
                  })),
                )
              }
            />
            {activeRole.items.length > MIN_ITEMS_PER_ROLE ? (
              <div className="flex justify-end border-t border-[var(--border)] pt-4">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-[var(--muted-foreground)]"
                  onClick={() => {
                    onChange({
                      ...updateRoleInDraft(draft, activeRole.localId, (role) => ({
                        ...role,
                        items: role.items.filter((i) => i.localId !== activeItem.localId),
                      })),
                      tasks: draft.tasks.map((task) => ({
                        ...task,
                        acceptedItemIds: task.acceptedItemIds.filter(
                          (id) => id !== activeItem.localId,
                        ),
                      })),
                    });
                  }}
                >
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                  {editorItemLabel(itemIndex)} 삭제
                </Button>
              </div>
            ) : null}
          </div>
        </EditorCard>
      ) : null
    );
  }

  return (
    <EditorCard bodyClassName="flex flex-col gap-5">
      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange({ ...draft, tasks: [...draft.tasks, createEmptyTask()] })}
        >
          <Plus className="mr-1 h-4 w-4" />
          과제 추가
        </Button>
      </div>
      {draft.tasks.map((task, index) => (
          <TaskBlock
            key={task.localId}
            task={task}
            index={index}
            flatItems={flatItems}
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
    </EditorCard>
  );
}
