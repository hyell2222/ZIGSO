import type { Ingredient, LunchMenu, ScenarioPack } from "@/lib/lunch/types";
import { SCENARIO_PACK_VERSION } from "@/lib/lunch/types";

const HINT_KEYS = ["stage1", "stage2", "stage3", "stage4", "stage5"] as const;
const MENU_SLOTS = ["rice", "soup", "side1", "side2", "side3", "dessert"] as const;
const INGREDIENT_CATEGORIES = ["staple", "soup", "side", "dessert", "other"] as const;

export type PackValidationIssue = { path: string; message: string };

export function validateScenarioPack(pack: unknown): PackValidationIssue[] {
  const issues: PackValidationIssue[] = [];
  if (!pack || typeof pack !== "object") {
    return [{ path: "", message: "pack must be an object" }];
  }
  const p = pack as Record<string, unknown>;

  if (p.version !== SCENARIO_PACK_VERSION) {
    issues.push({ path: "version", message: `version must be ${SCENARIO_PACK_VERSION}` });
  }
  if (typeof p.title !== "string" || !p.title.trim()) {
    issues.push({ path: "title", message: "title is required" });
  }
  if (typeof p.description !== "string") {
    issues.push({ path: "description", message: "description must be a string" });
  }
  if (!["Easy", "Normal", "Hard"].includes(p.difficulty as string)) {
    issues.push({ path: "difficulty", message: "difficulty must be Easy | Normal | Hard" });
  }
  if (!["A1", "A2", "B1", "B2"].includes(p.englishLevel as string)) {
    issues.push({ path: "englishLevel", message: "englishLevel must be A1 | A2 | B1 | B2" });
  }
  if (typeof p.teamSize !== "number" || p.teamSize < 2 || p.teamSize > 12) {
    issues.push({ path: "teamSize", message: "teamSize must be 2–12" });
  }

  const ingredients = Array.isArray(p.ingredients) ? p.ingredients : [];
  const menus = Array.isArray(p.menus) ? p.menus : [];
  const commandCards = Array.isArray(p.commandCards) ? p.commandCards : [];

  if (ingredients.length < 1) {
    issues.push({ path: "ingredients", message: "at least one ingredient required" });
  }
  if (menus.length < 1) {
    issues.push({ path: "menus", message: "at least one menu required" });
  }

  const ingredientIds = new Set<string>();
  for (let i = 0; i < ingredients.length; i++) {
    issues.push(...validateIngredient(ingredients[i], `ingredients[${i}]`, ingredientIds));
  }

  const menuIds = new Set<string>();
  const usedSlots = new Set<string>();
  for (let i = 0; i < menus.length; i++) {
    issues.push(
      ...validateMenu(menus[i], `menus[${i}]`, menuIds, usedSlots, ingredientIds),
    );
  }

  for (let i = 0; i < commandCards.length; i++) {
    const c = commandCards[i];
    if (!c || typeof c !== "object") {
      issues.push({ path: `commandCards[${i}]`, message: "must be an object" });
      continue;
    }
    const card = c as Record<string, unknown>;
    if (typeof card.id !== "string" || !card.id.trim()) {
      issues.push({ path: `commandCards[${i}].id`, message: "id required" });
    }
    if (typeof card.text !== "string" || !card.text.trim()) {
      issues.push({ path: `commandCards[${i}].text`, message: "text required" });
    }
  }

  return issues;
}

function validateIngredient(
  raw: unknown,
  path: string,
  seenIds: Set<string>,
): PackValidationIssue[] {
  const issues: PackValidationIssue[] = [];
  if (!raw || typeof raw !== "object") {
    return [{ path, message: "must be an object" }];
  }
  const ing = raw as Record<string, unknown>;
  if (typeof ing.id !== "string" || !ing.id.trim()) {
    issues.push({ path: `${path}.id`, message: "id required" });
  } else if (seenIds.has(ing.id)) {
    issues.push({ path: `${path}.id`, message: "duplicate ingredient id" });
  } else {
    seenIds.add(ing.id);
  }
  if (typeof ing.name !== "string" || !ing.name.trim()) {
    issues.push({ path: `${path}.name`, message: "name required" });
  }
  if (!INGREDIENT_CATEGORIES.includes(ing.category as (typeof INGREDIENT_CATEGORIES)[number])) {
    issues.push({ path: `${path}.category`, message: "invalid category" });
  }
  const hints = ing.hints;
  if (!hints || typeof hints !== "object") {
    issues.push({ path: `${path}.hints`, message: "hints object required" });
  } else {
    const h = hints as Record<string, unknown>;
    for (const key of HINT_KEYS) {
      if (typeof h[key] !== "string" || !(h[key] as string).trim()) {
        issues.push({ path: `${path}.hints.${key}`, message: "hint text required" });
      }
    }
  }
  if (typeof ing.cookingHint !== "string" || !ing.cookingHint.trim()) {
    issues.push({ path: `${path}.cookingHint`, message: "cookingHint required" });
  }
  return issues;
}

function validateMenu(
  raw: unknown,
  path: string,
  seenMenuIds: Set<string>,
  usedSlots: Set<string>,
  ingredientIds: Set<string>,
): PackValidationIssue[] {
  const issues: PackValidationIssue[] = [];
  if (!raw || typeof raw !== "object") {
    return [{ path, message: "must be an object" }];
  }
  const menu = raw as Record<string, unknown>;
  if (typeof menu.id !== "string" || !menu.id.trim()) {
    issues.push({ path: `${path}.id`, message: "id required" });
  } else if (seenMenuIds.has(menu.id)) {
    issues.push({ path: `${path}.id`, message: "duplicate menu id" });
  } else {
    seenMenuIds.add(menu.id);
  }
  if (typeof menu.name !== "string" || !menu.name.trim()) {
    issues.push({ path: `${path}.name`, message: "name required" });
  }
  const slot = menu.slot as string;
  if (!MENU_SLOTS.includes(slot as (typeof MENU_SLOTS)[number])) {
    issues.push({ path: `${path}.slot`, message: "invalid slot" });
  } else if (usedSlots.has(slot)) {
    issues.push({ path: `${path}.slot`, message: `duplicate slot: ${slot}` });
  } else {
    usedSlots.add(slot);
  }
  const ids = Array.isArray(menu.ingredientIds) ? menu.ingredientIds : [];
  if (ids.length < 1) {
    issues.push({ path: `${path}.ingredientIds`, message: "at least one ingredient" });
  }
  for (const id of ids) {
    if (typeof id !== "string" || !ingredientIds.has(id)) {
      issues.push({ path: `${path}.ingredientIds`, message: `unknown ingredient: ${id}` });
    }
  }
  const steps = Array.isArray(menu.cookingSteps) ? menu.cookingSteps : [];
  if (steps.length < 1) {
    issues.push({ path: `${path}.cookingSteps`, message: "at least one cooking step" });
  }
  return issues;
}

export function isValidScenarioPack(pack: unknown): pack is ScenarioPack {
  return validateScenarioPack(pack).length === 0;
}

/** @deprecated use validateScenarioPack */
export const validateLunchPack = validateScenarioPack;
/** @deprecated use isValidScenarioPack */
export const isValidLunchPack = isValidScenarioPack;

export function normalizeIngredientAnswer(answer: string): string {
  return answer.trim().toLowerCase().replace(/\s+/g, " ");
}

export function isIngredientAnswerCorrect(ingredient: Ingredient, answer: string): boolean {
  const normalized = normalizeIngredientAnswer(answer);
  const candidates = [
    ingredient.name,
    ingredient.id.replace(/_/g, " "),
    ...(ingredient.aliases ?? []),
  ].map(normalizeIngredientAnswer);
  return candidates.some((c) => c === normalized);
}
