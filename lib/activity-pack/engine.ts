import type {
  ActivityPack,
  PracticeQuestionResult,
  QuizAnswer,
  QuizQuestion,
  Role,
} from "@/lib/activity-pack/types";
import { averagePracticeBaseScore, practiceBaseScore } from "@/lib/activity-pack/scoring";
import { MIN_ROLES_PER_GROUP } from "@/lib/activity-pack/sizing";
import { isChoiceCorrect } from "@/lib/activity-pack/validate";

/** activity-pack 엔진·API 공통 메시지 */
export const PLAYER_MESSAGES = {
  defaultPackTitle: "새 활동",
  unknownRole: "역할 정보를 찾을 수 없어요.",
  quizIncomplete: "아직 답하지 않은 문항이 있어요.",
  practiceAlreadyDone: "이미 연습 문제를 마쳤어요.",
  practiceIncomplete: "아직 풀지 않은 연습 문제가 있어요.",
  individualQuizAlreadySubmitted: "이미 실전 문제를 마쳤어요.",
  homeGroupAlreadyDone: "이미 서로 알려주기를 마쳤어요.",
  operationFailed: "요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.",
} as const;

export function getRoleById(pack: ActivityPack, roleId: string): Role | undefined {
  return pack.roles.find((r) => r.id === roleId);
}

/** 역할의 연습 문제 목록 */
export function getPracticeQuestions(
  pack: ActivityPack,
  roleId: string | null,
): QuizQuestion[] {
  if (!roleId) return [];
  return getRoleById(pack, roleId)?.practiceQuestions ?? [];
}

/** 개별 형성평가 문항 = 모든 역할의 실전 문제 (역할 순서대로) */
export function getTestQuestions(pack: ActivityPack): QuizQuestion[] {
  return pack.roles.flatMap((r) => r.testQuestions);
}

/** 해설 모달에 표시할 문항이 있는지 */
export function hasReviewQuestions(pack: ActivityPack): boolean {
  const practiceCount = pack.roles.reduce(
    (sum, role) => sum + role.practiceQuestions.length,
    0,
  );
  return practiceCount + getTestQuestions(pack).length > 0;
}

/** 연습 문항별 결과 → 기준 점수(평균). 문항 점수는 오답 횟수에서 파생한다. */
export function computeBaseScoreFromPracticeResults(results: PracticeQuestionResult[]): number {
  return averagePracticeBaseScore(results.map((r) => practiceBaseScore(r.wrongAttempts)));
}

/** 서로 알려주기 — 모둠원(내 역할 제외) 연습 문항 */
export function getPeerPracticeQuestions(
  pack: ActivityPack,
  memberRoleIds: Array<string | null | undefined>,
  ownRoleId: string | null,
): QuizQuestion[] {
  const otherRoleIds = [
    ...new Set(
      memberRoleIds.filter((id): id is string => Boolean(id) && id !== ownRoleId),
    ),
  ];
  return otherRoleIds.flatMap((roleId) => getPracticeQuestions(pack, roleId));
}

/** 서로 알려주기 — 모둠원 파트 연습 완료 여부 */
export function isPeerPracticeComplete(
  questions: QuizQuestion[],
  completedQuestionIds: string[],
): boolean {
  if (questions.length === 0) return true;
  const done = new Set(completedQuestionIds);
  return questions.every((q) => done.has(q.id));
}

/** 연습 완료 여부 — 역할 연습 문항 수와 결과 수가 일치 */
export function isPracticeCompleteForRole(
  questions: QuizQuestion[],
  results: PracticeQuestionResult[],
): boolean {
  if (questions.length === 0) return false;
  const doneIds = new Set(results.map((r) => r.questionId));
  return questions.every((q) => doneIds.has(q.id));
}

export type QuizGrade = {
  required: number;
  answered: number;
  correctCount: number;
  complete: boolean;
};

/** 객관식 채점 (맞힌 개수·응답 수) */
export function gradeQuiz(questions: QuizQuestion[], answers: QuizAnswer[]): QuizGrade {
  const byId = new Map(answers.map((a) => [a.questionId, a.choiceIndex]));
  let correctCount = 0;
  let answered = 0;
  for (const q of questions) {
    const choice = byId.get(q.id);
    if (choice === undefined) continue;
    answered += 1;
    if (isChoiceCorrect(q, choice)) correctCount += 1;
  }
  return {
    required: questions.length,
    answered,
    correctCount,
    complete: questions.length > 0 && answered >= questions.length,
  };
}

/** 개별 형성평가 채점 */
export function gradeTest(pack: ActivityPack, answers: QuizAnswer[]): QuizGrade {
  return gradeQuiz(getTestQuestions(pack), answers);
}

export function isQuizComplete(questions: QuizQuestion[], answers: QuizAnswer[]): boolean {
  return gradeQuiz(questions, answers).complete;
}

/** PracticeResult from UI → stored result (점수는 wrongAttempts에서 파생) */
export function toPracticeQuestionResult(
  questionId: string,
  wrongAttempts: number,
): PracticeQuestionResult {
  return { questionId, wrongAttempts };
}

// =====================================================================
// 모둠·역할 배정
// =====================================================================

export type RoleAssignment = {
  roleId: string;
};

export type AssignableMember = {
  id: string;
  assigned_role_id: string | null;
  created_at?: string | null;
};

/** 세션·샌드박스 공통 — 모둠 이름(모둠 1, 모둠 2 …) */
export function groupLabel(index: number): string {
  return `모둠 ${index + 1}`;
}

/** 카드·배지 등 표시용 — 저장값이 숫자만이어도 '모둠' 접두사 보장 */
export function formatGroupDisplayName(name: string | null | undefined): string {
  const trimmed = name?.trim();
  if (!trimmed) return "—";
  if (trimmed.startsWith("모둠")) return trimmed;
  return `모둠 ${trimmed}`;
}

/** 헤더·overview 등 라벨+숫자 분리 표시용 — '모둠 1' → '1' */
export function groupNumberDisplay(name: string | null | undefined): string {
  const trimmed = name?.trim();
  if (!trimmed) return "—";
  if (trimmed.startsWith("모둠")) {
    const number = trimmed.slice(2).trim();
    return number || "—";
  }
  return trimmed;
}

/** 세션·샌드박스 공통 — 모둠 수 */
export function computeSessionGroupCount(playerCount: number, rolesPerGroup: number): number {
  const roleCount = Math.max(MIN_ROLES_PER_GROUP, rolesPerGroup);
  if (playerCount <= 0) return 0;
  if (playerCount <= roleCount) return 1;
  return Math.max(1, Math.floor(playerCount / roleCount));
}

export function assignRolesToPlayers(
  pack: ActivityPack,
  playerIds: string[],
): Map<string, RoleAssignment> {
  const assignment = new Map<string, RoleAssignment>();
  const roles = pack.roles;
  if (roles.length === 0 || playerIds.length === 0) return assignment;

  const playerCount = playerIds.length;
  const roleCount = roles.length;

  if (playerCount > roleCount) {
    const pairedRoleCount = playerCount - roleCount;
    let playerIndex = 0;
    for (let ri = 0; ri < roleCount && playerIndex < playerCount; ri++) {
      const role = roles[ri]!;
      const playersForThisRole = ri < pairedRoleCount ? 2 : 1;
      for (let j = 0; j < playersForThisRole && playerIndex < playerCount; j++) {
        assignment.set(playerIds[playerIndex]!, { roleId: role.id });
        playerIndex++;
      }
    }
    return assignment;
  }

  let playerIndex = 0;
  for (let ri = 0; ri < roleCount && playerIndex < playerCount; ri++) {
    const remainingPlayers = playerCount - playerIndex;
    const remainingRoles = roleCount - ri;
    const playersForThisRole = Math.ceil(remainingPlayers / remainingRoles);
    for (let j = 0; j < playersForThisRole && playerIndex < playerCount; j++) {
      assignment.set(playerIds[playerIndex]!, { roleId: roles[ri]!.id });
      playerIndex++;
    }
  }

  return assignment;
}
