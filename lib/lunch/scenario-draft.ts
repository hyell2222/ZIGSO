import type {
  CookingStep,
  EnglishLevel,
  Ingredient,
  IngredientHints,
  LunchMenu,
  ScenarioPack,
} from "@/lib/lunch/types";
import { SCENARIO_PACK_VERSION } from "@/lib/lunch/types";
import { makeTempId } from "@/lib/temp-id";

export type MenuSlot = LunchMenu["slot"];

export const MENU_SLOTS: MenuSlot[] = ["rice", "soup", "side1", "side2", "side3", "dessert"];

export const MENU_SLOT_LABELS: Record<MenuSlot, string> = {
  rice: "밥",
  soup: "국",
  side1: "반찬 1",
  side2: "반찬 2",
  side3: "반찬 3",
  dessert: "후식",
};

export const HINT_STAGE_LABELS: Record<keyof IngredientHints, string> = {
  stage1: "1단계 힌트 (5점 · 가장 어려움)",
  stage2: "2단계 힌트 (4점)",
  stage3: "3단계 힌트 (3점)",
  stage4: "4단계 힌트 (2점)",
  stage5: "5단계 힌트 (1점 · 가장 쉬움)",
};

export type EditorIngredient = {
  localId: string;
  id: string;
  name: string;
  hints: IngredientHints;
  cookingHint: string;
};

export type EditorMenu = {
  localId: string;
  id: string;
  name: string;
  slot: MenuSlot;
  ingredients: EditorIngredient[];
  cookingSteps: string[];
};

export type ScenarioEditorDraft = {
  teamSize: number;
  englishLevel: EnglishLevel;
  difficulty: "Easy" | "Normal" | "Hard";
  menus: EditorMenu[];
};

const EMPTY_HINTS = (): IngredientHints => ({
  stage1: "",
  stage2: "",
  stage3: "",
  stage4: "",
  stage5: "",
});

export function createEmptyIngredient(): EditorIngredient {
  return {
    localId: makeTempId(),
    id: "",
    name: "",
    hints: EMPTY_HINTS(),
    cookingHint: "",
  };
}

export function createEmptyMenu(slot: MenuSlot): EditorMenu {
  return {
    localId: makeTempId(),
    id: "",
    name: "",
    slot,
    ingredients: [createEmptyIngredient()],
    cookingSteps: [""],
  };
}

export function createDefaultTrayDraft(): ScenarioEditorDraft {
  return {
    teamSize: 4,
    englishLevel: "A2",
    difficulty: "Normal",
    menus: MENU_SLOTS.map((slot) => createEmptyMenu(slot)),
  };
}

function slugFromName(name: string, fallback: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 48);
  return slug || fallback;
}

function categoryForSlot(slot: MenuSlot): Ingredient["category"] {
  if (slot === "rice") return "staple";
  if (slot === "soup") return "soup";
  if (slot === "dessert") return "dessert";
  return "side";
}

export function packToEditorDraft(pack: ScenarioPack): ScenarioEditorDraft {
  const ingredientById = new Map(pack.ingredients.map((i) => [i.id, i]));

  const menus: EditorMenu[] = pack.menus.map((menu) => ({
    localId: makeTempId(),
    id: menu.id,
    name: menu.name,
    slot: menu.slot,
    ingredients: menu.ingredientIds.map((ingId) => {
      const ing = ingredientById.get(ingId);
      return {
        localId: makeTempId(),
        id: ing?.id ?? ingId,
        name: ing?.name ?? "",
        hints: ing?.hints ?? EMPTY_HINTS(),
        cookingHint: ing?.cookingHint ?? "",
      };
    }),
    cookingSteps:
      menu.cookingSteps.length > 0
        ? [...menu.cookingSteps].sort((a, b) => a.order - b.order).map((s) => s.sentence)
        : [""],
  }));

  return {
    teamSize: pack.teamSize,
    englishLevel: pack.englishLevel,
    difficulty: pack.difficulty,
    menus: menus.length > 0 ? menus : createDefaultTrayDraft().menus,
  };
}

export function editorDraftToPack(draft: ScenarioEditorDraft): ScenarioPack {
  const usedIngredientIds = new Set<string>();
  const allIngredients: Ingredient[] = [];
  const menus: LunchMenu[] = [];
  const commandTexts = new Set<string>();

  for (const menu of draft.menus) {
    const menuId = slugFromName(menu.name, menu.slot);
    const ingredientIds: string[] = [];

    for (let i = 0; i < menu.ingredients.length; i++) {
      const raw = menu.ingredients[i]!;
      const baseId = slugFromName(raw.name, `${menu.slot}_ing_${i + 1}`);
      let id = baseId;
      let n = 2;
      while (usedIngredientIds.has(id)) {
        id = `${baseId}_${n}`;
        n++;
      }
      usedIngredientIds.add(id);
      ingredientIds.push(id);

      allIngredients.push({
        id,
        name: raw.name.trim(),
        category: categoryForSlot(menu.slot),
        hints: {
          stage1: raw.hints.stage1.trim(),
          stage2: raw.hints.stage2.trim(),
          stage3: raw.hints.stage3.trim(),
          stage4: raw.hints.stage4.trim(),
          stage5: raw.hints.stage5.trim(),
        },
        cookingHint: raw.cookingHint.trim(),
      });
    }

    const cookingSteps: CookingStep[] = menu.cookingSteps
      .map((s) => s.trim())
      .filter(Boolean)
      .map((sentence, idx) => {
        commandTexts.add(sentence);
        return { order: idx + 1, sentence };
      });

    menus.push({
      id: menuId,
      name: menu.name.trim(),
      slot: menu.slot,
      ingredientIds,
      cookingSteps,
    });
  }

  const menuNames = menus.map((m) => m.name).filter(Boolean);
  const title =
    menuNames.length > 0 ? `Today's Lunch: ${menuNames.slice(0, 3).join(", ")}` : "School Lunch Rush";

  const commandCards = [...commandTexts].map((text, idx) => ({
    id: slugFromName(text, `step_${idx + 1}`),
    text,
  }));

  return {
    version: SCENARIO_PACK_VERSION,
    title,
    description:
      "Work together as cafeteria staff. Deduce ingredients from English hints, then complete today's lunch tray before time runs out.",
    difficulty: draft.difficulty,
    englishLevel: draft.englishLevel,
    teamSize: draft.teamSize,
    menus,
    ingredients: allIngredients,
    commandCards,
  };
}

export function validateEditorDraft(draft: ScenarioEditorDraft): string[] {
  const errors: string[] = [];
  if (draft.menus.length === 0) {
    errors.push("메뉴를 한 가지 이상 추가하세요.");
    return errors;
  }

  const slots = new Set<MenuSlot>();
  for (const menu of draft.menus) {
    if (!menu.name.trim()) errors.push(`「${MENU_SLOT_LABELS[menu.slot]}」메뉴 이름을 입력하세요.`);
    if (slots.has(menu.slot)) errors.push(`슬롯 ${MENU_SLOT_LABELS[menu.slot]}이(가) 중복되었습니다.`);
    slots.add(menu.slot);

    if (menu.ingredients.length === 0) {
      errors.push(`「${menu.name || MENU_SLOT_LABELS[menu.slot]}」에 재료를 한 가지 이상 추가하세요.`);
    }
    for (const ing of menu.ingredients) {
      if (!ing.name.trim()) {
        errors.push(`「${menu.name || MENU_SLOT_LABELS[menu.slot]}」의 재료 이름을 입력하세요.`);
      }
      for (const [key, label] of Object.entries(HINT_STAGE_LABELS) as [keyof IngredientHints, string][]) {
        if (!ing.hints[key].trim()) {
          errors.push(
            `「${menu.name || MENU_SLOT_LABELS[menu.slot]}」·${ing.name || "재료"} — ${label}을(를) 입력하세요.`,
          );
        }
      }
    }

    const steps = menu.cookingSteps.map((s) => s.trim()).filter(Boolean);
    if (steps.length === 0) {
      errors.push(`「${menu.name || MENU_SLOT_LABELS[menu.slot]}」에 조리 순서(영어 명령문)를 한 단계 이상 입력하세요.`);
    }
  }

  return errors;
}
