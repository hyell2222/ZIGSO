import type { ActivityPack, QuizQuestion, Role } from "@/lib/activity-pack/types";
import { ACTIVITY_PACK_VERSION } from "@/lib/activity-pack/types";

export const MIN_ROLES_PER_GROUP = 2;
export const MAX_ROLES_PER_GROUP = 12;

export const MIN_CHOICES_PER_QUESTION = 2;
export const MAX_CHOICES_PER_QUESTION = 6;
/** 보기 표시 라벨 (A~F) — 객관식 보기 공통 */
export const CHOICE_LABELS = ["A", "B", "C", "D", "E", "F"] as const;
/** 역할당 연습·실전 문제 최소 개수 */
export const MIN_QUESTIONS_PER_ROLE = 1;

export type PackValidationIssue = { path: string; message: string };

export function validateActivityPack(pack: ActivityPack): PackValidationIssue[] {
  const issues: PackValidationIssue[] = [];

  if (pack.version !== ACTIVITY_PACK_VERSION) {
    issues.push({ path: "version", message: `version must be ${ACTIVITY_PACK_VERSION}` });
  }
  if (typeof pack.title !== "string" || !pack.title.trim()) {
    issues.push({ path: "title", message: "title is required" });
  }
  if (typeof pack.description !== "string") {
    issues.push({ path: "description", message: "description must be a string" });
  }

  const roleCount = pack.roles.length;
  if (roleCount < MIN_ROLES_PER_GROUP || roleCount > MAX_ROLES_PER_GROUP) {
    issues.push({
      path: "roles",
      message: `roles count must be ${MIN_ROLES_PER_GROUP}–${MAX_ROLES_PER_GROUP} (defines group size)`,
    });
  }

  const roleIds = new Set<string>();
  const questionIds = new Set<string>();
  for (let ri = 0; ri < pack.roles.length; ri++) {
    issues.push(...validateRole(pack.roles[ri], `roles[${ri}]`, roleIds, questionIds));
  }

  return issues;
}

function validateRole(
  raw: unknown,
  path: string,
  seenIds: Set<string>,
  questionIds: Set<string>,
): PackValidationIssue[] {
  const issues: PackValidationIssue[] = [];
  if (!raw || typeof raw !== "object") {
    return [{ path, message: "must be an object" }];
  }
  const role = raw as Role;
  if (typeof role.id !== "string" || !role.id.trim()) {
    issues.push({ path: `${path}.id`, message: "id required" });
  } else if (seenIds.has(role.id)) {
    issues.push({ path: `${path}.id`, message: "duplicate role id" });
  } else {
    seenIds.add(role.id);
  }
  if (typeof role.name !== "string") {
    issues.push({ path: `${path}.name`, message: "name must be a string" });
  }
  if (typeof role.segment !== "string" || !role.segment.trim()) {
    issues.push({ path: `${path}.segment`, message: "segment required" });
  }
  issues.push(
    ...validateQuestionList(role.practiceQuestions, `${path}.practiceQuestions`, questionIds),
  );
  issues.push(...validateQuestionList(role.testQuestions, `${path}.testQuestions`, questionIds));
  return issues;
}

function validateQuestionList(
  questions: QuizQuestion[],
  path: string,
  seenIds: Set<string>,
): PackValidationIssue[] {
  const issues: PackValidationIssue[] = [];
  if (!Array.isArray(questions)) {
    return [{ path, message: "must be an array" }];
  }
  if (questions.length < MIN_QUESTIONS_PER_ROLE) {
    issues.push({
      path,
      message: `must have at least ${MIN_QUESTIONS_PER_ROLE} question(s)`,
    });
    return issues;
  }
  questions.forEach((q, qi) => {
    issues.push(...validateQuestion(q, `${path}[${qi}]`, seenIds));
  });
  return issues;
}

function validateQuestion(
  raw: unknown,
  path: string,
  seenIds: Set<string>,
): PackValidationIssue[] {
  const issues: PackValidationIssue[] = [];
  if (!raw || typeof raw !== "object") {
    return [{ path, message: "must be an object" }];
  }
  const q = raw as QuizQuestion;
  if (typeof q.id !== "string" || !q.id.trim()) {
    issues.push({ path: `${path}.id`, message: "id required" });
  } else if (seenIds.has(q.id)) {
    issues.push({ path: `${path}.id`, message: "duplicate question id" });
  } else {
    seenIds.add(q.id);
  }
  if (typeof q.prompt !== "string" || !q.prompt.trim()) {
    issues.push({ path: `${path}.prompt`, message: "prompt required" });
  }
  if (!Array.isArray(q.choices)) {
    issues.push({ path: `${path}.choices`, message: "choices array required" });
  } else {
    if (q.choices.length < MIN_CHOICES_PER_QUESTION || q.choices.length > MAX_CHOICES_PER_QUESTION) {
      issues.push({
        path: `${path}.choices`,
        message: `choices must be ${MIN_CHOICES_PER_QUESTION}–${MAX_CHOICES_PER_QUESTION}`,
      });
    }
    q.choices.forEach((c, ci) => {
      if (typeof c !== "string" || !c.trim()) {
        issues.push({ path: `${path}.choices[${ci}]`, message: "choice text required" });
      }
    });
    if (
      typeof q.correctIndex !== "number" ||
      !Number.isInteger(q.correctIndex) ||
      q.correctIndex < 0 ||
      q.correctIndex >= q.choices.length
    ) {
      issues.push({ path: `${path}.correctIndex`, message: "correctIndex out of range" });
    }
  }
  if (q.hints !== undefined && !Array.isArray(q.hints)) {
    issues.push({ path: `${path}.hints`, message: "hints must be an array" });
  }
  if (q.explanation !== undefined && typeof q.explanation !== "string") {
    issues.push({ path: `${path}.explanation`, message: "explanation must be a string" });
  }
  return issues;
}

/** 객관식 채점 — 선택 보기가 정답인지 */
export function isChoiceCorrect(question: QuizQuestion, choiceIndex: number): boolean {
  return question.correctIndex === choiceIndex;
}
