import {
  MAX_ROLES_PER_GROUP,
  MIN_ROLES_PER_GROUP,
  normalizePackSizing,
} from "@/lib/activity-pack/sizing";
import {
  MIN_CHOICES_PER_QUESTION,
  MIN_QUESTIONS_PER_ROLE,
} from "@/lib/activity-pack/validate";
import { parseActivityPack } from "@/lib/activity-pack/parse";
import samplePack from "@/lib/activity-pack/sample-pack.json";
import type { ActivityPack, QuizQuestion, Role } from "@/lib/activity-pack/types";
import { ACTIVITY_PACK_VERSION } from "@/lib/activity-pack/types";
import { makeTempId } from "@/lib/temp-id";

export { MAX_ROLES_PER_GROUP, MIN_ROLES_PER_GROUP } from "@/lib/activity-pack/sizing";
export {
  MAX_CHOICES_PER_QUESTION,
  MIN_CHOICES_PER_QUESTION,
  MIN_QUESTIONS_PER_ROLE,
} from "@/lib/activity-pack/validate";

export const DEFAULT_CHOICE_COUNT = 4;

export type EditorQuestion = {
  localId: string;
  id: string;
  prompt: string;
  choices: string[];
  correctIndex: number;
  hints: string;
  explanation: string;
};

export type EditorRole = {
  localId: string;
  id: string;
  segment: string;
  keyPoints: string;
  practiceQuestions: EditorQuestion[];
  testQuestions: EditorQuestion[];
};

export type ActivityEditorDraft = {
  title: string;
  description: string;
  roles: EditorRole[];
};

export function createEmptyQuestion(choiceCount = DEFAULT_CHOICE_COUNT): EditorQuestion {
  return {
    localId: makeTempId(),
    id: "",
    prompt: "",
    choices: Array.from({ length: choiceCount }, () => ""),
    correctIndex: 0,
    hints: "",
    explanation: "",
  };
}

export function createEmptyRole(): EditorRole {
  return {
    localId: makeTempId(),
    id: "",
    segment: "",
    keyPoints: "",
    practiceQuestions: [createEmptyQuestion()],
    testQuestions: [createEmptyQuestion()],
  };
}

export function editorRoleLabel(index: number): string {
  return `역할 ${index + 1}`;
}

export function editorQuestionLabel(index: number): string {
  return `${index + 1}번 문항`;
}

function keyPointsToLines(keyPoints: string): string[] {
  return keyPoints
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function questionToEditor(q: QuizQuestion): EditorQuestion {
  return {
    localId: makeTempId(),
    id: q.id,
    prompt: q.prompt,
    choices: [...q.choices],
    correctIndex: q.correctIndex,
    hints: (q.hints ?? []).join("\n"),
    explanation: q.explanation ?? "",
  };
}

function questionsToEditor(questions: QuizQuestion[]): EditorQuestion[] {
  return questions.length > 0 ? questions.map(questionToEditor) : [createEmptyQuestion()];
}

export function createDefaultActivityDraft(): ActivityEditorDraft {
  const pack = parseActivityPack(samplePack);
  if (!pack) {
    throw new Error("sample-pack.json이 유효한 ActivityPack(v5) 형식이 아닙니다.");
  }
  return packToEditorDraft(pack);
}

export function packToEditorDraft(pack: ActivityPack): ActivityEditorDraft {
  const roles: EditorRole[] = pack.roles.map((role) => ({
    localId: makeTempId(),
    id: role.id,
    segment: role.segment,
    keyPoints: (role.keyPoints ?? []).join("\n"),
    practiceQuestions: questionsToEditor(role.practiceQuestions),
    testQuestions: questionsToEditor(role.testQuestions),
  }));

  return {
    title: pack.title.replace(/^활동:\s*/, ""),
    description: pack.description,
    roles: roles.length > 0 ? roles : [createEmptyRole(), createEmptyRole()],
  };
}

export function editorDraftToPack(draft: ActivityEditorDraft): ActivityPack {
  const usedQuestionIds = new Set<string>();
  const toQuestion = (
    raw: EditorQuestion,
    fallbackId: string,
    includeScaffold: boolean,
  ): QuizQuestion => {
    const base = raw.id.trim() || fallbackId;
    let id = base;
    let suffix = 2;
    while (usedQuestionIds.has(id)) {
      id = `${base}_${suffix}`;
      suffix += 1;
    }
    usedQuestionIds.add(id);
    const choices = raw.choices.map((c) => c.trim()).filter(Boolean);
    const correctIndex =
      raw.correctIndex >= 0 && raw.correctIndex < choices.length ? raw.correctIndex : 0;
    const hints = includeScaffold ? keyPointsToLines(raw.hints) : [];
    const explanation = includeScaffold ? raw.explanation.trim() : "";
    return {
      id,
      prompt: raw.prompt.trim(),
      choices,
      correctIndex,
      hints: hints.length > 0 ? hints : undefined,
      explanation: explanation || undefined,
    };
  };

  const toQuestions = (
    list: EditorQuestion[],
    prefix: string,
    includeScaffold: boolean,
  ): QuizQuestion[] =>
    list.map((q, i) => toQuestion(q, `${prefix}_${i + 1}`, includeScaffold));

  const usedRoleIds = new Set<string>();
  const roles: Role[] = draft.roles.map((rawRole, ri) => {
    const base = `role_${ri + 1}`;
    let roleId = rawRole.id.trim() || base;
    let suffix = 2;
    while (usedRoleIds.has(roleId)) {
      roleId = `${base}_${suffix}`;
      suffix += 1;
    }
    usedRoleIds.add(roleId);
    const keyPoints = keyPointsToLines(rawRole.keyPoints);
    return {
      id: roleId,
      name: "",
      segment: rawRole.segment.trim(),
      keyPoints: keyPoints.length > 0 ? keyPoints : undefined,
      practiceQuestions: toQuestions(rawRole.practiceQuestions, `${roleId}_practice`, true),
      testQuestions: toQuestions(rawRole.testQuestions, `${roleId}_test`, false),
    };
  });

  const title = draft.title.trim()
    ? draft.title.trim().startsWith("활동:")
      ? draft.title.trim()
      : `활동: ${draft.title.trim()}`
    : "새 직소 활동";

  return normalizePackSizing({
    version: ACTIVITY_PACK_VERSION,
    title,
    description: draft.description.trim(),
    groupSize: roles.length,
    roles,
  });
}

export const EDITOR_STEPS = [
  { id: "basics", title: "활동 안내", description: "제목·학습 상황 소개" },
  {
    id: "roles",
    title: "역할·문제",
    description: "역할별 지문 + 연습 문제(여러 개) + 실전 문제(여러 개)",
  },
] as const;

export type EditorStepId = (typeof EDITOR_STEPS)[number]["id"];

function validateQuestion(q: EditorQuestion, label: string, errors: string[]) {
  if (!q.prompt.trim()) errors.push(`${label} 문제를 입력하세요.`);
  const filled = q.choices.map((c) => c.trim()).filter(Boolean);
  if (filled.length < MIN_CHOICES_PER_QUESTION) {
    errors.push(`${label} 보기를 ${MIN_CHOICES_PER_QUESTION}개 이상 입력하세요.`);
  }
  if (!q.choices[q.correctIndex]?.trim()) {
    errors.push(`${label} 정답 보기를 선택하세요.`);
  }
}

function validateQuestionList(
  questions: EditorQuestion[],
  label: string,
  errors: string[],
) {
  if (questions.length < MIN_QUESTIONS_PER_ROLE) {
    errors.push(`${label} 문항을 ${MIN_QUESTIONS_PER_ROLE}개 이상 추가하세요.`);
    return;
  }
  questions.forEach((q, qi) => {
    validateQuestion(q, `${label} ${editorQuestionLabel(qi)}`, errors);
  });
}

function validateRoles(draft: ActivityEditorDraft, errors: string[]) {
  if (draft.roles.length < MIN_ROLES_PER_GROUP || draft.roles.length > MAX_ROLES_PER_GROUP) {
    errors.push(`역할은 ${MIN_ROLES_PER_GROUP}~${MAX_ROLES_PER_GROUP}개입니다. (모둠 인원과 같습니다)`);
  }
  for (let ri = 0; ri < draft.roles.length; ri++) {
    const role = draft.roles[ri]!;
    const roleLabel = editorRoleLabel(ri);
    if (!role.segment.trim()) {
      errors.push(`「${roleLabel}」지문 조각·풀이 방식을 입력하세요.`);
    }
    validateQuestionList(role.practiceQuestions, `「${roleLabel}」연습`, errors);
    validateQuestionList(role.testQuestions, `「${roleLabel}」실전`, errors);
  }
}

export function validateEditorDraftStep(draft: ActivityEditorDraft, step: EditorStepId): string[] {
  const errors: string[] = [];
  if (step === "basics") {
    if (!draft.title.trim()) errors.push("수업·활동 제목을 입력하세요.");
    if (!draft.description.trim()) errors.push("활동 안내(학습 상황)를 입력하세요.");
    return errors;
  }
  if (step === "roles") {
    validateRoles(draft, errors);
  }
  return errors;
}

export function validateEditorDraft(draft: ActivityEditorDraft): string[] {
  const errors: string[] = [];
  if (!draft.title.trim()) errors.push("수업·활동 제목을 입력하세요.");
  if (!draft.description.trim()) errors.push("활동 안내(학습 상황)를 입력하세요.");
  validateRoles(draft, errors);
  return errors;
}
