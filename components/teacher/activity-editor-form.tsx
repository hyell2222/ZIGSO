"use client";

import { Plus, Trash2, ChevronDown, FileText, Layers, Folder } from "lucide-react";
import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  createEmptyTask,
  createEmptyItem,
  createEmptyRole,
  editorItemLabel,
  editorRoleLabel,
  flattenEditorItems,
  HINT_STAGE_LABELS,
  MAX_ITEMS_PER_ROLE,
  MAX_ROLES_PER_GROUP,
  MIN_ITEMS_PER_ROLE,
  MIN_ROLES_PER_GROUP,
  type EditorRole,
  type ActivityEditorDraft,
  type EditorStepId,
} from "@/lib/activity-pack/activity-draft";
import { TEACHER_EDITOR_COPY as ED } from "@/lib/copy/teacher";
import { cn } from "@/lib/utils";

type Props = {
  draft: ActivityEditorDraft;
  onChange: (draft: ActivityEditorDraft) => void;
  step: EditorStepId;
};

const HINT_KEYS = Object.keys(HINT_STAGE_LABELS) as (keyof typeof HINT_STAGE_LABELS)[];
const HINT_SHORT_LABELS: Record<keyof typeof HINT_STAGE_LABELS, string> = {
  stage1: "1단계 (5점)", stage2: "2단계 (4점)", stage3: "3단계 (3점)", stage4: "4단계 (2점)", stage5: "5단계 (1점)"
};

const inputBaseClass = "h-10 text-sm w-full"; 

function AccordionItem({
  icon,
  title,
  isOpen,
  onToggle,
  onDelete,
  disabledDelete,
  children,
}: {
  icon: ReactNode;
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  onDelete?: () => void;
  disabledDelete?: boolean;
  children: ReactNode;
}) {
  return (
    <div 
      className={cn(
        "rounded-xl border border-[var(--border)] bg-[var(--card-bg)] shadow-xs overflow-hidden",
        isOpen ? "border-[color-mix(in_srgb,var(--primary)_40%,var(--border))] shadow-sm" : "hover:border-[color-mix(in_srgb,var(--primary)_20%,var(--border))]"
      )}
    >
      <div 
        onClick={onToggle}
        className="flex items-center justify-between gap-4 p-3.5 cursor-pointer select-none"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--primary)_8%,var(--card-bg))] text-[var(--primary)]">
            {icon}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--foreground)] truncate">{title}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
          {onDelete && !disabledDelete && (
            <button 
              type="button"
              onClick={onDelete}
              className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--muted-foreground)] hover:text-[var(--danger)] hover:bg-[color-mix(in_srgb,var(--danger)_8%,transparent)]"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
          <ChevronDown className={cn("h-4 w-4 text-[var(--muted-foreground)] transition-transform duration-200", isOpen && "rotate-180 text-[var(--primary)]")} />
        </div>
      </div>

      {isOpen && (
        <div className="border-t border-[var(--border)] bg-[color-mix(in_srgb,var(--background)_8%,var(--card-bg))] px-4 py-4 sm:px-5 space-y-4 animate-fadeIn">
          {children}
        </div>
      )}
    </div>
  );
}

export function ActivityEditorForm({ draft, onChange, step }: Props) {
  const [openItemId, setOpenItemId] = useState<string | null>(null);
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);

  const flatItems = flattenEditorItems(draft);

  const updateRoleInDraft = (roleId: string, updater: (role: EditorRole) => EditorRole) => {
    onChange({ ...draft, roles: draft.roles.map((r) => (r.localId === roleId ? updater(r) : r)) });
  };

  // --- STEP 1: BASICS ---
  if (step === "basics") {
    return (
      <div className="max-w-2xl mx-auto w-full space-y-4">
        <p className="text-xs text-center sm:text-left sm:text-sm leading-relaxed text-[var(--muted-foreground)]">
          수업 주제와 활동 안내를 정합니다. 학생이 처음 보는 화면과 전체 학습 흐름의 기준이 됩니다.
        </p>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-5 shadow-xs space-y-4">
          <FormField label="활동 제목" htmlFor="activity-title">
            <Input
              id="activity-title"
              value={draft.title}
              onChange={(e) => onChange({ ...draft, title: e.target.value })}
              placeholder="예: 학교 축제 부스 운영하기"
              className={inputBaseClass}
            />
          </FormField>
          <FormField label={ED.labels.activityDesc} htmlFor="activity-desc">
            <Textarea
              id="activity-desc"
              rows={6}
              value={draft.description}
              onChange={(e) => onChange({ ...draft, description: e.target.value })}
              placeholder={ED.placeholders.desc}
              className="text-sm"
            />
          </FormField>
        </div>
      </div>
    );
  }

  // --- STEP 2: ITEMS ---
  if (step === "items") {
    const canAddRole = draft.roles.length < MAX_ROLES_PER_GROUP;
    const canRemoveRole = draft.roles.length > MIN_ROLES_PER_GROUP;

    return (
      <div className="max-w-2xl mx-auto w-full space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-xs sm:text-sm text-[var(--muted-foreground)]">{ED.itemsIntro}</p>
          {canAddRole && (
            <Button size="sm" onClick={() => onChange({ ...draft, roles: [...draft.roles, createEmptyRole()] })} className="gap-1 font-semibold text-xs shrink-0">
              <Plus className="h-3.5 w-3.5" /> {ED.actions.addRole}
            </Button>
          )}
        </div>

        <div className="space-y-6">
          {draft.roles.map((role, rIdx) => {
            const canAddItem = role.items.length < MAX_ITEMS_PER_ROLE;
            return (
              <div 
                key={role.localId} 
                className="rounded-2xl border-2 border-[color-mix(in_srgb,var(--border)_70%,transparent)] bg-[color-mix(in_srgb,var(--background)_30%,var(--card-bg))] p-4 space-y-4 shadow-xs"
              >
                <div className="flex items-center justify-between pb-1">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)]">
                      <Folder className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-bold text-[var(--foreground)]">{editorRoleLabel(rIdx)}</span>
                  </div>
                  
                  <div className="flex items-center gap-1.5">
                    {canAddItem && (
                      <button
                        type="button"
                        onClick={() => {
                          const newItem = createEmptyItem();
                          updateRoleInDraft(role.localId, r => ({ ...r, items: [...r.items, newItem] }));
                          setOpenItemId(newItem.localId);
                        }}
                        className="text-[var(--primary)] hover:underline text-xs font-bold flex items-center gap-0.5"
                      >
                        <Plus className="h-3.5 w-3.5" /> {ED.actions.addClue}
                      </button>
                    )}
                    {canRemoveRole && (
                      <button
                        type="button"
                        onClick={() => onChange({ ...draft, roles: draft.roles.filter(r => r.localId !== role.localId) })}
                        className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--muted-foreground)] hover:text-[var(--danger)] hover:bg-[color-mix(in_srgb,var(--danger)_8%,transparent)]"
                        title={ED.actions.deleteRole}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-2.5">
                  {role.items.map((item, iIdx) => (
                    <AccordionItem
                      key={item.localId}
                      icon={<FileText className="h-4 w-4" />}
                      title={item.name.trim() ? item.name.trim() : ED.unnamedItem(iIdx + 1)}
                      isOpen={openItemId === item.localId}
                      onToggle={() => setOpenItemId(openItemId === item.localId ? null : item.localId)}
                      onDelete={() => {
                        updateRoleInDraft(role.localId, r => ({ ...r, items: r.items.filter(i => i.localId !== item.localId) }));
                      }}
                      disabledDelete={role.items.length <= MIN_ITEMS_PER_ROLE}
                    >
                      <FormField label={ED.labels.itemName} htmlFor={`item-name-${item.localId}`}>
                        <Input
                          id={`item-name-${item.localId}`}
                          value={item.name}
                          onChange={(e) => {
                            const text = e.target.value;
                            updateRoleInDraft(role.localId, r => ({
                              ...r,
                              items: r.items.map(i => i.localId === item.localId ? { ...i, name: text } : i)
                            }));
                          }}
                          placeholder={ED.placeholders.itemName}
                          className={inputBaseClass}
                        />
                      </FormField>

                      <div className="space-y-2.5 border-t border-[var(--border)] pt-3.5">
                        <p className="text-xs font-bold text-[var(--foreground)]">{ED.labels.clueStages}</p>
                        <div className="grid gap-2">
                          {HINT_KEYS.map((key) => (
                            <div key={key} className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2">
                              <span className="text-xs text-[var(--muted-foreground)] font-semibold">{HINT_SHORT_LABELS[key]}</span>
                              <div className="sm:col-span-3">
                                <Input
                                  value={item.clues[key]}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    updateRoleInDraft(role.localId, r => ({
                                      ...r,
                                      items: r.items.map(i => i.localId === item.localId ? { ...i, clues: { ...i.clues, [key]: val } } : i)
                                    }));
                                  }}
                                  placeholder={ED.placeholders.clue}
                                  className={inputBaseClass}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </AccordionItem>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // --- STEP 3: TASKS ---
  return (
    <div className="max-w-2xl mx-auto w-full space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-xs sm:text-sm text-[var(--muted-foreground)]">{ED.tasksIntro}</p>
        <Button size="sm" onClick={() => onChange({ ...draft, tasks: [...draft.tasks, createEmptyTask()] })} className="gap-1 font-semibold text-xs shrink-0">
          <Plus className="h-3.5 w-3.5" /> {ED.actions.addMission}
        </Button>
      </div>

      <div className="space-y-2.5">
        {draft.tasks.map((task, idx) => (
          <AccordionItem
            key={task.localId}
            icon={<Layers className="h-4 w-4" />}
            title={task.title.trim() ? task.title.trim() : ED.unnamedMission(idx + 1)}
            isOpen={openTaskId === task.localId}
            onToggle={() => setOpenTaskId(openTaskId === task.localId ? null : task.localId)}
            onDelete={() => onChange({ ...draft, tasks: draft.tasks.filter(t => t.localId !== task.localId) })}
            disabledDelete={draft.tasks.length <= 1}
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <FormField label={ED.labels.missionTitle} htmlFor={`task-title-${task.localId}`}>
                  <Input
                    id={`task-title-${task.localId}`}
                    value={task.title}
                    onChange={(e) => {
                      const text = e.target.value;
                      onChange({ ...draft, tasks: draft.tasks.map(t => t.localId === task.localId ? { ...t, title: text } : t) });
                    }}
                    placeholder={ED.placeholders.missionTitle}
                    className={inputBaseClass}
                  />
                </FormField>
              </div>
            </div>

            <FormField label={ED.labels.missionDesc} htmlFor={`task-desc-${task.localId}`}>
              <Textarea
                id={`task-desc-${task.localId}`}
                rows={3}
                value={task.description}
                onChange={(e) => {
                  const text = e.target.value;
                  onChange({ ...draft, tasks: draft.tasks.map(t => t.localId === task.localId ? { ...t, description: text } : t) });
                }}
                placeholder={ED.placeholders.missionDesc}
                className="text-sm"
              />
            </FormField>

            <FormField label={ED.labels.requiredItems} help={ED.help.requiredItems}>
              <ul className="grid gap-2 grid-cols-1 sm:grid-cols-2 max-h-48 overflow-y-auto p-2 bg-[var(--background)] border border-[var(--border)] rounded-xl">
                {flatItems.map(({ item, roleLabel }) => {
                  const isChecked = task.acceptedItemIds.includes(item.localId);
                  return (
                    <li key={item.localId}>
                      <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-[var(--border)] bg-[var(--card-bg)] px-3 py-2 text-xs transition-colors hover:border-[var(--primary)] has-[:checked]:border-[var(--primary)] has-[:checked]:bg-[color-mix(in_srgb,var(--primary)_6%,var(--card-bg))]">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            const has = task.acceptedItemIds.includes(item.localId);
                            const nextIds = has 
                              ? task.acceptedItemIds.filter(id => id !== item.localId)
                              : [...task.acceptedItemIds, item.localId];
                            onChange({ ...draft, tasks: draft.tasks.map(t => t.localId === task.localId ? { ...t, acceptedItemIds: nextIds } : t) });
                          }}
                          className="accent-[var(--primary)] h-4 w-4 shrink-0"
                        />
                        <span className="truncate font-semibold text-xs">
                          [{roleLabel}] {item.name.trim() || ED.unnamedLinkedItem}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </FormField>
          </AccordionItem>
        ))}
      </div>
    </div>
  );
}