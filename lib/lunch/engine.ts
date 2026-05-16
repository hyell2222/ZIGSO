import type {
  AcquiredIngredient,
  CompletedMenu,
  Ingredient,
  LunchMenu,
  ScenarioPack,
} from "@/lib/lunch/types";
import { normalizeSentence, scoreForHintStage, scoreMenuCompletion } from "@/lib/lunch/scoring";
import { isIngredientAnswerCorrect } from "@/lib/lunch/validate";

export function getIngredientById(
  pack: ScenarioPack,
  ingredientId: string,
): Ingredient | undefined {
  return pack.ingredients.find((i) => i.id === ingredientId);
}

export function getMenuById(pack: ScenarioPack, menuId: string): LunchMenu | undefined {
  return pack.menus.find((m) => m.id === menuId);
}

export function hintTextForStage(ingredient: Ingredient, stage: 1 | 2 | 3 | 4 | 5): string {
  return ingredient.hints[`stage${stage}` as keyof typeof ingredient.hints];
}

export function tryAcquireIngredient(
  pack: ScenarioPack,
  ingredientId: string,
  answer: string,
  hintStageUsed: 1 | 2 | 3 | 4 | 5,
): { ok: true; record: AcquiredIngredient } | { ok: false; reason: string } {
  const ingredient = getIngredientById(pack, ingredientId);
  if (!ingredient) return { ok: false, reason: "Unknown ingredient." };
  if (!isIngredientAnswerCorrect(ingredient, answer)) {
    return { ok: false, reason: "Incorrect answer. Try again or reveal the next hint." };
  }
  return {
    ok: true,
    record: {
      ingredientId,
      hintStageUsed,
      score: scoreForHintStage(hintStageUsed),
      acquiredAt: new Date().toISOString(),
    },
  };
}

export function teamHasIngredientsForMenu(
  acquired: AcquiredIngredient[],
  menu: LunchMenu,
): boolean {
  const ids = new Set(acquired.map((a) => a.ingredientId));
  return menu.ingredientIds.every((id) => ids.has(id));
}

export function tryCompleteMenu(
  pack: ScenarioPack,
  menuId: string,
  acquired: AcquiredIngredient[],
  submittedSteps: string[],
): { ok: true; record: CompletedMenu } | { ok: false; reason: string } {
  const menu = getMenuById(pack, menuId);
  if (!menu) return { ok: false, reason: "Unknown menu." };
  if (!teamHasIngredientsForMenu(acquired, menu)) {
    return { ok: false, reason: "Your team has not acquired all ingredients for this menu." };
  }
  const correctSteps = menu.cookingSteps.map((s) => s.sentence);
  const score = scoreMenuCompletion(correctSteps, submittedSteps);
  const allCorrect =
    correctSteps.length === submittedSteps.length &&
    correctSteps.every((s, i) => normalizeSentence(s) === normalizeSentence(submittedSteps[i] ?? ""));
  if (!allCorrect) {
    return { ok: false, reason: "Cooking steps do not match. Check the order and sentences." };
  }
  return {
    ok: true,
    record: {
      menuId,
      submittedSteps,
      completedAt: new Date().toISOString(),
      score,
    },
  };
}

/** 직소: 팀 인원에 맞게 재료를 순환 배정 */
export function assignIngredientsToPlayers(
  pack: ScenarioPack,
  playerIds: string[],
): Map<string, string> {
  const assignment = new Map<string, string>();
  const ingredients = pack.ingredients;
  if (ingredients.length === 0 || playerIds.length === 0) return assignment;
  playerIds.forEach((playerId, index) => {
    assignment.set(playerId, ingredients[index % ingredients.length]!.id);
  });
  return assignment;
}

export function totalTeamScore(
  acquired: AcquiredIngredient[],
  completed: CompletedMenu[],
): number {
  return (
    acquired.reduce((sum, a) => sum + a.score, 0) +
    completed.reduce((sum, m) => sum + m.score, 0)
  );
}
