import {
  getPeerPracticeQuestions,
  getPracticeQuestions,
  gradeTest,
  isPeerPracticeComplete,
} from "@/lib/activity-pack/engine";
import type { ActivityPack, PracticeQuestionResult, QuizAnswer } from "@/lib/activity-pack/types";
import type { ActivityPhase } from "@/types/index";

export type PlayerPhaseFields = {
  group_id?: string | null;
  assigned_role_id?: string | null;
  practice_results?: PracticeQuestionResult[];
  practice_submitted_at?: string | null;
  peer_practice_completed?: string[];
  home_group_completed_at?: string | null;
  individual_quiz_answers?: QuizAnswer[];
  individual_quiz_submitted_at?: string | null;
};

export type PhaseCompleteContext = {
  pack?: ActivityPack | null;
  /** 서로 알려주기 — 같은 모둠원 역할 id 목록 */
  memberRoleIds?: Array<string | null | undefined>;
};

function countCompletedQuestions(
  questionIds: string[],
  completedIds: Iterable<string>,
): number {
  const done = new Set(completedIds);
  return questionIds.filter((id) => done.has(id)).length;
}

function ratioToPercent(completed: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.round((completed / total) * 100));
}

/** 교사 역할 배정 카드 — 현재 단계 진행률 (0–100). 표시하지 않을 단계는 null */
export function getPlayerPhaseProgress(
  phase: ActivityPhase,
  player: PlayerPhaseFields,
  context?: PhaseCompleteContext,
): number | null {
  switch (phase) {
    case "overview":
    case "waiting":
    case "results":
      return null;
    case "expert_group": {
      if (player.practice_submitted_at) return 100;
      if (!context?.pack || !player.assigned_role_id) return 0;
      const questions = getPracticeQuestions(context.pack, player.assigned_role_id);
      const completed = countCompletedQuestions(
        questions.map((q) => q.id),
        (player.practice_results ?? []).map((r) => r.questionId),
      );
      return ratioToPercent(completed, questions.length);
    }
    case "home_group": {
      if (player.home_group_completed_at) return 100;
      if (!context?.pack || !context.memberRoleIds) return 0;
      const peerQuestions = getPeerPracticeQuestions(
        context.pack,
        context.memberRoleIds,
        player.assigned_role_id ?? null,
      );
      if (peerQuestions.length === 0) return 100;
      const completed = countCompletedQuestions(
        peerQuestions.map((q) => q.id),
        player.peer_practice_completed ?? [],
      );
      return ratioToPercent(completed, peerQuestions.length);
    }
    case "individual_quiz": {
      if (player.individual_quiz_submitted_at) return 100;
      if (!context?.pack) return 0;
      const grade = gradeTest(context.pack, player.individual_quiz_answers ?? []);
      return ratioToPercent(grade.answered, grade.required);
    }
    default:
      return null;
  }
}

/** 교사 역할 배정 카드 — 현재 단계의 완료 액션 충족 여부 */
export function isPlayerPhaseComplete(
  phase: ActivityPhase,
  player: PlayerPhaseFields,
  context?: PhaseCompleteContext,
): boolean {
  if (phase === "expert_group") {
    return Boolean(player.practice_submitted_at);
  }
  if (phase === "home_group") {
    return Boolean(player.home_group_completed_at);
  }
  if (phase === "individual_quiz") {
    return Boolean(player.individual_quiz_submitted_at);
  }
  const progress = getPlayerPhaseProgress(phase, player, context);
  if (progress !== null) return progress >= 100;
  switch (phase) {
    case "overview":
      return false;
    default:
      return false;
  }
}
