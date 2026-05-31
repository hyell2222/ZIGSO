"use client";

import { Plus, Trash2, ChevronDown, FileText, Folder, BookOpen } from "lucide-react";
import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  createEmptyItem,
  createEmptyRole,
  editorItemLabel,
  editorRoleLabel,
  editorSlotToken,
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
import { extractSlotIdsFromPassage } from "@/lib/activity-pack/worksheet";
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
              placeholder="예: 교과서 본문: Save Our Planet"
              className={inputBaseClass}
            />
          </FormField>
          <FormField label="활동 안내" htmlFor="activity-desc">
            <Textarea
              id="activity-desc"
              rows={6}
              value={draft.description}
              onChange={(e) => onChange({ ...draft, description: e.target.value })}
              placeholder="학습 목표와 활동 상황을 간단히 적어 주세요."
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
          <p className="text-xs sm:text-sm text-[var(--muted-foreground)]">
            모둠 인원만큼 역할을 두고, 역할마다 단어(정답)와 5단계 단서를 작성합니다. 전문가 집단에서 단어 카드로 획득합니다.
          </p>
          {canAddRole && (
            <Button size="sm" onClick={() => onChange({ ...draft, roles: [...draft.roles, createEmptyRole()] })} className="gap-1 font-semibold text-xs shrink-0">
              <Plus className="h-3.5 w-3.5" /> 역할 추가
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
                        <Plus className="h-3.5 w-3.5" /> 단어 추가
                      </button>
                    )}
                    {canRemoveRole && (
                      <button
                        type="button"
                        onClick={() => onChange({ ...draft, roles: draft.roles.filter(r => r.localId !== role.localId) })}
                        className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--muted-foreground)] hover:text-[var(--danger)] hover:bg-[color-mix(in_srgb,var(--danger)_8%,transparent)]"
                        title="역할 삭제"
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
                      title={item.name.trim() ? item.name.trim() : `단어 ${iIdx + 1} (이름 미입력)`}
                      isOpen={openItemId === item.localId}
                      onToggle={() => setOpenItemId(openItemId === item.localId ? null : item.localId)}
                      onDelete={() => {
                        updateRoleInDraft(role.localId, r => ({ ...r, items: r.items.filter(i => i.localId !== item.localId) }));
                      }}
                      disabledDelete={role.items.length <= MIN_ITEMS_PER_ROLE}
                    >
                      <FormField label="단어 (정답)" htmlFor={`item-name-${item.localId}`}>
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
                          placeholder="예: environment"
                          className={inputBaseClass}
                        />
                      </FormField>

                      <div className="space-y-2.5 border-t border-[var(--border)] pt-3.5">
                        <p className="text-xs font-bold text-[var(--foreground)]">5단계 단서</p>
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
                                  placeholder="단서 문장을 입력하세요."
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

  // --- STEP 3: WORKSHEET ---
  const flatItems = flattenEditorItems(draft);
  const slotIds = extractSlotIdsFromPassage(draft.summaryPassage);

  return (
    <div className="max-w-2xl mx-auto w-full space-y-4">
      <p className="text-xs sm:text-sm text-[var(--muted-foreground)]">
        홈 집단에서 함께 완성할 최종 요약문입니다. {"{{slot_id}}"} 형식으로 빈칸을 넣으세요. 각 역할의 단어가 해당 역할 학생 화면의 빈칸이 됩니다.
      </p>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-5 shadow-xs space-y-4">
        <FormField
          label="최종 요약문"
          htmlFor="summary-passage"
          help="빈칸은 {{slot_단어id}} 형식입니다. 학생은 자신의 빈칸에 직접 넣을 수 없고, 팀원이 자신의 슬롯에 단어 카드를 배치합니다."
        >
          <Textarea
            id="summary-passage"
            rows={8}
            value={draft.summaryPassage}
            onChange={(e) => onChange({ ...draft, summaryPassage: e.target.value })}
            placeholder="예: 교과서 지문에 따르면 {{slot_environment}}을(를) 지키려면 {{slot_pollution}}을(를) 줄여야 합니다."
            className="text-sm font-mono"
          />
        </FormField>

        {slotIds.length > 0 ? (
          <p className="text-xs text-[var(--muted-foreground)]">
            감지된 빈칸 {slotIds.length}개: {slotIds.join(", ")}
          </p>
        ) : null}

        <div className="border-t border-[var(--border)] pt-4 space-y-2">
          <p className="text-xs font-bold text-[var(--foreground)]">빈칸 삽입</p>
          <div className="flex flex-wrap gap-2">
            {draft.roles.map((role, rIdx) =>
              role.items.map((item, iIdx) => {
                const token = editorSlotToken(item, rIdx, iIdx);
                const label = item.name.trim() || `단어 ${iIdx + 1} (이름 미입력)`;
                return (
                  <Button
                    key={item.localId}
                    type="button"
                    size="sm"
                    variant="outline"
                    className="text-xs font-mono"
                    onClick={() =>
                      onChange({
                        ...draft,
                        summaryPassage: `${draft.summaryPassage}${draft.summaryPassage && !draft.summaryPassage.endsWith(" ") ? " " : ""}${token}`,
                      })
                    }
                  >
                    <BookOpen className="mr-1 h-3.5 w-3.5" />
                    [{editorRoleLabel(rIdx)}] {label}
                  </Button>
                );
              }),
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
