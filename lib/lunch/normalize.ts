import { PLAYER_MESSAGES } from "@/lib/lunch/player-messages";
import type { ScenarioPack } from "@/lib/lunch/types";
import { SCENARIO_PACK_VERSION } from "@/lib/lunch/types";
import { validateScenarioPack } from "@/lib/lunch/validate";

/** AI·수동 입력을 게임 엔진이 쓸 수 있는 팩으로 정규화 */
export function normalizeScenarioPack(raw: unknown): ScenarioPack {
  const p = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;

  const ingredients = (Array.isArray(p.ingredients) ? p.ingredients : []).map((ing) => {
    const i = ing as Record<string, unknown>;
    const hintsRaw = (i.hints ?? {}) as Record<string, unknown>;
    return {
      id: slugId(String(i.id ?? i.name ?? "ingredient")),
      name: String(i.name ?? "").trim(),
      category: coerceCategory(i.category),
      hints: {
        stage1: String(hintsRaw.stage1 ?? "").trim(),
        stage2: String(hintsRaw.stage2 ?? "").trim(),
        stage3: String(hintsRaw.stage3 ?? "").trim(),
        stage4: String(hintsRaw.stage4 ?? "").trim(),
        stage5: String(hintsRaw.stage5 ?? "").trim(),
      },
      cookingHint: String(i.cookingHint ?? "").trim(),
      aliases: Array.isArray(i.aliases)
        ? i.aliases.map((a) => String(a).trim().toLowerCase()).filter(Boolean)
        : undefined,
    };
  });

  const ingredientIdSet = new Set(ingredients.map((i) => i.id));

  const menus = (Array.isArray(p.menus) ? p.menus : []).map((menu) => {
    const m = menu as Record<string, unknown>;
    const steps = (Array.isArray(m.cookingSteps) ? m.cookingSteps : []).map((step, idx) => {
      const s = step as Record<string, unknown>;
      return {
        order: typeof s.order === "number" ? s.order : idx + 1,
        sentence: String(s.sentence ?? "").trim(),
      };
    });
    return {
      id: slugId(String(m.id ?? m.name ?? "menu")),
      name: String(m.name ?? "").trim(),
      slot: coerceSlot(m.slot),
      ingredientIds: (Array.isArray(m.ingredientIds) ? m.ingredientIds : [])
        .map((id) => slugId(String(id)))
        .filter((id) => ingredientIdSet.has(id)),
      cookingSteps: steps.sort((a, b) => a.order - b.order),
    };
  });

  const commandCards = (Array.isArray(p.commandCards) ? p.commandCards : []).map((card, idx) => {
    const c = card as Record<string, unknown>;
    const text = String(c.text ?? "").trim();
    return {
      id: slugId(String(c.id ?? `card_${idx + 1}`)),
      text,
    };
  });

  const pack: ScenarioPack = {
    version: SCENARIO_PACK_VERSION,
    title: String(p.title ?? PLAYER_MESSAGES.defaultPackTitle).trim(),
    description: String(p.description ?? "").trim(),
    difficulty: coerceDifficulty(p.difficulty),
    englishLevel: coerceEnglishLevel(p.englishLevel),
    teamSize: clamp(Number(p.teamSize) || 4, 2, 12),
    ingredients,
    menus,
    commandCards,
  };

  const issues = validateScenarioPack(pack);
  if (issues.length > 0) {
    throw new Error(
      `시나리오 정규화 후 검증 실패: ${issues.map((i) => `${i.path}: ${i.message}`).join("; ")}`,
    );
  }
  return pack;
}

/** @deprecated use normalizeScenarioPack */
export const normalizeLunchPack = normalizeScenarioPack;

function slugId(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 48) || "item";
}

function coerceDifficulty(v: unknown): "Easy" | "Normal" | "Hard" {
  const s = String(v ?? "Normal");
  if (s === "Easy" || s === "Normal" || s === "Hard") return s;
  return "Normal";
}

function coerceEnglishLevel(v: unknown): "A1" | "A2" | "B1" | "B2" {
  const s = String(v ?? "A2");
  if (s === "A1" || s === "A2" || s === "B1" || s === "B2") return s;
  return "A2";
}

function coerceCategory(v: unknown): "staple" | "soup" | "side" | "dessert" | "other" {
  const s = String(v ?? "other");
  if (s === "staple" || s === "soup" || s === "side" || s === "dessert" || s === "other") {
    return s;
  }
  return "other";
}

function coerceSlot(v: unknown): "rice" | "soup" | "side1" | "side2" | "side3" | "dessert" {
  const s = String(v ?? "side1");
  const slots = ["rice", "soup", "side1", "side2", "side3", "dessert"] as const;
  return slots.includes(s as (typeof slots)[number]) ? (s as (typeof slots)[number]) : "side1";
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}
