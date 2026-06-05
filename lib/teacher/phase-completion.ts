import { getPeerPracticeQuestions, isPeerPracticeComplete } from "@/lib/activity-pack/engine";
import type { ActivityPack } from "@/lib/activity-pack/types";
import type { ActivityPhase } from "@/lib/types";

export type PlayerPhaseFields = {
  group_id?: string | null;
  assigned_role_id?: string | null;
  practice_submitted_at?: string | null;
  peer_practice_completed?: string[];
  home_group_completed_at?: string | null;
  individual_quiz_submitted_at?: string | null;
};

export type PhaseCompleteContext = {
  pack?: ActivityPack | null;
  /** 서로 알려주기 — 같은 모둠원 역할 id 목록 */
  memberRoleIds?: Array<string | null | undefined>;
};

/** 교사 역할 배정 카드 — 현재 단계의 완료 액션 충족 여부 */
export function isPlayerPhaseComplete(
  phase: ActivityPhase,
  player: PlayerPhaseFields,
  context?: PhaseCompleteContext,
): boolean {
  switch (phase) {
    case "overview":
      return false;
    case "expert_group":
      return Boolean(player.practice_submitted_at);
    case "home_group": {
      if (player.home_group_completed_at) return true;
      if (!context?.pack || !context.memberRoleIds) return false;
      const peerQuestions = getPeerPracticeQuestions(
        context.pack,
        context.memberRoleIds,
        player.assigned_role_id ?? null,
      );
      return isPeerPracticeComplete(peerQuestions, player.peer_practice_completed ?? []);
    }
    case "individual_quiz":
      return Boolean(player.individual_quiz_submitted_at);
    default:
      return false;
  }
}
