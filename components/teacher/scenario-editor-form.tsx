"use client";

import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DIFFICULTY_UI_OPTIONS } from "@/lib/api/lessons";
import {
  createEmptyIngredient,
  createEmptyMenu,
  HINT_STAGE_LABELS,
  MENU_SLOT_LABELS,
  MENU_SLOTS,
  type EditorIngredient,
  type EditorMenu,
  type MenuSlot,
  type ScenarioEditorDraft,
} from "@/lib/lunch/scenario-draft";
import type { EnglishLevel } from "@/lib/lunch/types";

const ENGLISH_LEVELS: EnglishLevel[] = ["A1", "A2", "B1", "B2"];

type Props = {
  draft: ScenarioEditorDraft;
  onChange: (draft: ScenarioEditorDraft) => void;
};

function FieldLabel({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="text-xs font-medium text-[var(--accent)]">
      {children}
    </label>
  );
}

function IngredientEditor({
  ingredient,
  menuLabel,
  onChange,
  onRemove,
  canRemove,
}: {
  ingredient: EditorIngredient;
  menuLabel: string;
  onChange: (next: EditorIngredient) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-[var(--foreground)]">재료</p>
        {canRemove ? (
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onRemove}>
            <Trash2 className="h-4 w-4" aria-hidden />
            <span className="sr-only">재료 삭제</span>
          </Button>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <FieldLabel htmlFor={`ing-name-${ingredient.localId}`}>재료명 (정답, 영어)</FieldLabel>
          <Input
            id={`ing-name-${ingredient.localId}`}
            value={ingredient.name}
            onChange={(e) => onChange({ ...ingredient, name: e.target.value })}
            placeholder="e.g. tomato"
          />
        </div>
        <div className="space-y-1.5">
          <FieldLabel htmlFor={`ing-cook-hint-${ingredient.localId}`}>조리 힌트 (팀 공유, 영어)</FieldLabel>
          <Input
            id={`ing-cook-hint-${ingredient.localId}`}
            value={ingredient.cookingHint}
            onChange={(e) => onChange({ ...ingredient, cookingHint: e.target.value })}
            placeholder="Short tip for the team kitchen"
          />
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-[var(--muted-foreground)]">
          영어 추리 힌트 (전문가 집단 · {menuLabel})
        </p>
        {(Object.keys(HINT_STAGE_LABELS) as (keyof typeof HINT_STAGE_LABELS)[]).map((key) => (
          <div key={key} className="space-y-1">
            <FieldLabel htmlFor={`${ingredient.localId}-${key}`}>{HINT_STAGE_LABELS[key]}</FieldLabel>
            <Textarea
              id={`${ingredient.localId}-${key}`}
              rows={2}
              value={ingredient.hints[key]}
              onChange={(e) =>
                onChange({
                  ...ingredient,
                  hints: { ...ingredient.hints, [key]: e.target.value },
                })
              }
              placeholder="English hint text"
              className="min-h-[3.5rem]"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function MenuEditorCard({
  menu,
  onChange,
  onRemove,
  canRemove,
}: {
  menu: EditorMenu;
  onChange: (next: EditorMenu) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const [open, setOpen] = useState(true);
  const slotLabel = MENU_SLOT_LABELS[menu.slot];

  const updateIngredient = (localId: string, next: EditorIngredient) => {
    onChange({
      ...menu,
      ingredients: menu.ingredients.map((i) => (i.localId === localId ? next : i)),
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
            {menu.name.trim() || "메뉴 이름 없음"}
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
              <FieldLabel htmlFor={`menu-name-${menu.localId}`}>메뉴 이름 (영어)</FieldLabel>
              <Input
                id={`menu-name-${menu.localId}`}
                value={menu.name}
                onChange={(e) => onChange({ ...menu, name: e.target.value })}
                placeholder="e.g. kimchi fried rice"
              />
            </div>
            <div className="space-y-1.5">
              <FieldLabel htmlFor={`menu-slot-${menu.localId}`}>급식판 칸</FieldLabel>
              <select
                id={`menu-slot-${menu.localId}`}
                value={menu.slot}
                onChange={(e) => onChange({ ...menu, slot: e.target.value as MenuSlot })}
                className="h-10 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm"
              >
                {MENU_SLOTS.map((slot) => (
                  <option key={slot} value={slot}>
                    {MENU_SLOT_LABELS[slot]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-[var(--foreground)]">재료 & 영어 힌트</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  onChange({
                    ...menu,
                    ingredients: [...menu.ingredients, createEmptyIngredient()],
                  })
                }
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                재료 추가
              </Button>
            </div>
            <div className="space-y-3">
              {menu.ingredients.map((ing) => (
                <IngredientEditor
                  key={ing.localId}
                  ingredient={ing}
                  menuLabel={menu.name.trim() || slotLabel}
                  onChange={(next) => updateIngredient(ing.localId, next)}
                  onRemove={() =>
                    onChange({
                      ...menu,
                      ingredients: menu.ingredients.filter((i) => i.localId !== ing.localId),
                    })
                  }
                  canRemove={menu.ingredients.length > 1}
                />
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-[var(--foreground)]">조리 순서</h3>
                <p className="text-xs text-[var(--muted-foreground)]">
                  영어 명령문을 순서대로 입력하세요. 학생이 카드로 조합합니다.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onChange({ ...menu, cookingSteps: [...menu.cookingSteps, ""] })}
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                단계 추가
              </Button>
            </div>
            <ol className="space-y-2">
              {menu.cookingSteps.map((step, idx) => (
                <li key={`${menu.localId}-step-${idx}`} className="flex gap-2">
                  <span className="mt-2.5 w-6 shrink-0 text-center text-xs font-mono text-[var(--muted-foreground)]">
                    {idx + 1}
                  </span>
                  <Input
                    value={step}
                    onChange={(e) => {
                      const cookingSteps = [...menu.cookingSteps];
                      cookingSteps[idx] = e.target.value;
                      onChange({ ...menu, cookingSteps });
                    }}
                    placeholder="e.g. Heat the pan."
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
                        const cookingSteps = [...menu.cookingSteps];
                        [cookingSteps[idx - 1], cookingSteps[idx]] = [
                          cookingSteps[idx]!,
                          cookingSteps[idx - 1]!,
                        ];
                        onChange({ ...menu, cookingSteps });
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
                      disabled={idx === menu.cookingSteps.length - 1}
                      onClick={() => {
                        const cookingSteps = [...menu.cookingSteps];
                        [cookingSteps[idx], cookingSteps[idx + 1]] = [
                          cookingSteps[idx + 1]!,
                          cookingSteps[idx]!,
                        ];
                        onChange({ ...menu, cookingSteps });
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
                    disabled={menu.cookingSteps.length <= 1}
                    onClick={() =>
                      onChange({
                        ...menu,
                        cookingSteps: menu.cookingSteps.filter((_, i) => i !== idx),
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

export function ScenarioEditorForm({ draft, onChange }: Props) {
  const updateMenu = (localId: string, next: EditorMenu) => {
    onChange({
      ...draft,
      menus: draft.menus.map((m) => (m.localId === localId ? next : m)),
    });
  };

  const usedSlots = new Set(draft.menus.map((m) => m.slot));
  const nextFreeSlot = MENU_SLOTS.find((s) => !usedSlots.has(s));

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <h2 className="text-sm font-semibold text-[var(--foreground)]">수업 설정</h2>
        <p className="mt-1 text-xs text-[var(--muted-foreground)]">
          School Lunch Rush 기본 템플릿이 적용됩니다. 팀 규모와 난이도만 조정하면 됩니다.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <FieldLabel>팀 인원</FieldLabel>
            <Input
              type="number"
              min={2}
              max={12}
              value={draft.teamSize}
              onChange={(e) =>
                onChange({
                  ...draft,
                  teamSize: Math.min(12, Math.max(2, Number(e.target.value) || 4)),
                })
              }
            />
          </div>
          <div className="space-y-1.5">
            <FieldLabel>영어 수준</FieldLabel>
            <select
              value={draft.englishLevel}
              onChange={(e) =>
                onChange({ ...draft, englishLevel: e.target.value as EnglishLevel })
              }
              className="h-10 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm"
            >
              {ENGLISH_LEVELS.map((lv) => (
                <option key={lv} value={lv}>
                  {lv}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <FieldLabel>난이도</FieldLabel>
            <select
              value={draft.difficulty}
              onChange={(e) =>
                onChange({
                  ...draft,
                  difficulty: e.target.value as ScenarioEditorDraft["difficulty"],
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
            <h2 className="text-lg font-semibold text-[var(--foreground)]">오늘의 급식 메뉴</h2>
            <p className="text-sm text-[var(--muted-foreground)]">
              메뉴별 재료(5단계 영어 힌트)와 조리 순서를 작성하세요.
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
                menus: [...draft.menus, createEmptyMenu(nextFreeSlot)],
              });
            }}
          >
            <Plus className="mr-1 h-4 w-4" />
            메뉴 추가
          </Button>
        </div>

        <div className="space-y-4">
          {draft.menus.map((menu) => (
            <MenuEditorCard
              key={menu.localId}
              menu={menu}
              onChange={(next) => updateMenu(menu.localId, next)}
              onRemove={() =>
                onChange({
                  ...draft,
                  menus: draft.menus.filter((m) => m.localId !== menu.localId),
                })
              }
              canRemove={draft.menus.length > 1}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
