import { PLAYER_MESSAGES } from "@/lib/activity-pack/player-messages";
import type { ItemCategory, ActivityPack, TaskSlot } from "@/lib/activity-pack/types";
import { ACTIVITY_PACK_VERSION } from "@/lib/activity-pack/types";
import { validateActivityPack } from "@/lib/activity-pack/validate";

const TASK_SLOTS: TaskSlot[] = ["slot1", "slot2", "slot3", "slot4", "slot5", "slot6"];
const ITEM_CATEGORIES: ItemCategory[] = [
  "primary",
  "secondary",
  "tertiary",
  "quaternary",
  "bonus",
  "other",
];

/** AI·수동 입력을 게임 엔진이 쓸 수 있는 ActivityPack으로 정규화 */
export function normalizeActivityPack(raw: unknown): ActivityPack {
  const p = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;

  const rawItems = Array.isArray(p.items) ? p.items : [];

  const items = rawItems.map((ing) => {
    const i = ing as Record<string, unknown>;
    const hintsRaw = (i.hints ?? {}) as Record<string, unknown>;
    return {
      id: slugId(String(i.id ?? i.name ?? "item")),
      name: String(i.name ?? "").trim(),
      category: coerceCategory(i.category),
      hints: {
        stage1: String(hintsRaw.stage1 ?? "").trim(),
        stage2: String(hintsRaw.stage2 ?? "").trim(),
        stage3: String(hintsRaw.stage3 ?? "").trim(),
        stage4: String(hintsRaw.stage4 ?? "").trim(),
        stage5: String(hintsRaw.stage5 ?? "").trim(),
      },
      groupHint: String(i.groupHint ?? "").trim(),
      aliases: Array.isArray(i.aliases)
        ? i.aliases.map((a) => String(a).trim().toLowerCase()).filter(Boolean)
        : undefined,
    };
  });

  const itemIdSet = new Set(items.map((i) => i.id));

  const rawTasks = Array.isArray(p.tasks) ? p.tasks : [];

  const tasks = rawTasks.map((task) => {
    const m = task as Record<string, unknown>;
    const stepsRaw = Array.isArray(m.steps) ? m.steps : [];
    const steps = stepsRaw.map((step, idx) => {
      const s = step as Record<string, unknown>;
      return {
        order: typeof s.order === "number" ? s.order : idx + 1,
        sentence: String(s.sentence ?? "").trim(),
      };
    });
    return {
      id: slugId(String(m.id ?? m.name ?? "task")),
      name: String(m.name ?? "").trim(),
      slot: coerceSlot(m.slot),
      itemIds: (Array.isArray(m.itemIds) ? m.itemIds : [])
        .map((id) => slugId(String(id)))
        .filter((id) => itemIdSet.has(id)),
      steps: steps.sort((a, b) => a.order - b.order),
    };
  });

  const rawCards = Array.isArray(p.actionCards) ? p.actionCards : [];

  const actionCards = rawCards.map((card, idx) => {
    const c = card as Record<string, unknown>;
    const text = String(c.text ?? "").trim();
    return {
      id: slugId(String(c.id ?? `card_${idx + 1}`)),
      text,
    };
  });

  const pack: ActivityPack = {
    version: ACTIVITY_PACK_VERSION,
    title: String(p.title ?? PLAYER_MESSAGES.defaultPackTitle).trim(),
    description: String(p.description ?? "").trim(),
    difficulty: coerceDifficulty(p.difficulty),
    groupSize: clamp(Number(p.groupSize) || 4, 2, 12),
    items,
    tasks,
    actionCards,
  };

  const issues = validateActivityPack(pack);
  if (issues.length > 0) {
    throw new Error(
      `활동 팩 정규화 후 검증 실패: ${issues.map((i) => `${i.path}: ${i.message}`).join("; ")}`,
    );
  }
  return pack;
}

function slugId(value: string): string {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "")
      .slice(0, 48) || "item"
  );
}

function coerceDifficulty(v: unknown): "Easy" | "Normal" | "Hard" {
  const s = String(v ?? "Normal");
  if (s === "Easy" || s === "Normal" || s === "Hard") return s;
  return "Normal";
}

function coerceCategory(v: unknown): ItemCategory {
  const s = String(v ?? "other");
  return ITEM_CATEGORIES.includes(s as ItemCategory) ? (s as ItemCategory) : "other";
}

function coerceSlot(v: unknown): TaskSlot {
  const s = String(v ?? "slot1");
  return TASK_SLOTS.includes(s as TaskSlot) ? (s as TaskSlot) : "slot1";
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}
