import { normalizePackSizing } from "@/lib/activity-pack/activity-draft";
import { validateActivityPack } from "@/lib/activity-pack/validate";
import type { ActivityPack, QuizQuestion, Role } from "@/lib/activity-pack/types";

/** JSON(unknown) → ActivityPack. 형식이 맞지 않으면 null */
export function parseActivityPack(raw: unknown): ActivityPack | null {
  if (!raw || typeof raw !== "object") return null;
  const p = raw as Record<string, unknown>;

  if (!Array.isArray(p.roles) || p.roles.length === 0) return null;

  const seenRoleIds = new Set<string>();
  const seenQuestionIds = new Set<string>();
  const roles: Role[] = (p.roles as unknown[]).map((entry, idx) =>
    readRole(entry, idx, seenRoleIds, seenQuestionIds),
  );

  const testQuestions = readQuestionList(
    p.testQuestions ?? p.testQuestion,
    "test",
    seenQuestionIds,
  );

  const pack = normalizePackSizing({
    roles,
    testQuestions,
  });

  return validateActivityPack(pack).length === 0 ? pack : null;
}

function readRole(
  raw: unknown,
  idx: number,
  seenRoleIds: Set<string>,
  seenQuestionIds: Set<string>,
): Role {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const roleId = `role_${idx + 1}`;
  seenRoleIds.add(roleId);

  const practiceQuestions = readQuestionList(
    r.practiceQuestions ?? r.practiceQuestion,
    `${roleId}_practice`,
    seenQuestionIds,
  );

  return {
    id: roleId,
    segment: String(r.segment ?? ""),
    practiceQuestions,
  };
}

/** 단일 객체 또는 배열 → 문항 배열 (구 v5 단일 필드 호환) */
function readQuestionList(
  raw: unknown,
  idPrefix: string,
  seenQuestionIds: Set<string>,
): QuizQuestion[] {
  if (Array.isArray(raw)) {
    return raw.map((entry, qi) => readQuestion(entry, `${idPrefix}_${qi + 1}`, seenQuestionIds));
  }
  if (raw && typeof raw === "object") {
    return [readQuestion(raw, idPrefix, seenQuestionIds)];
  }
  return [readQuestion(null, idPrefix, seenQuestionIds)];
}

function readQuestion(
  raw: unknown,
  defaultId: string,
  seenQuestionIds: Set<string>,
): QuizQuestion {
  const q = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;

  const id = defaultId;
  seenQuestionIds.add(id);

  const choices = Array.isArray(q.choices)
    ? q.choices.map((c) => String(c ?? "").trim()).filter(Boolean)
    : [];

  let correctIndex = typeof q.correctIndex === "number" ? Math.floor(q.correctIndex) : 0;
  if (correctIndex < 0 || correctIndex >= choices.length) correctIndex = 0;

  return {
    id,
    prompt: String(q.prompt ?? ""),
    choices,
    correctIndex,
  };
}
