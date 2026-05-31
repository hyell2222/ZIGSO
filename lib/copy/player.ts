import { COPY_DEFAULTS } from "@/lib/copy/defaults";

/** 학생 플레이 중 시스템·검증 메시지 */
export const PLAYER_COPY = {
  acquireSuccess: (score: number) => `맞출 아이템 획득! +${score}점`,
  missionComplete: (title: string, score?: number) =>
    typeof score === "number" ? `「${title}」모둠 미션 완료! +${score}점` : `「${title}」모둠 미션 완료!`,
  incorrectItemAnswer: "아직 맞출 아이템이 아니에요. 단서를 다시 보고 추리해 보세요.",
  unknownItem: "맞출 아이템 정보를 찾을 수 없어요.",
  unknownMission: "모둠 미션을 찾을 수 없어요.",
  missingItems: "아직 모둠이 모으지 못한 맞출 아이템이 있어요.",
  missionNeedsAllItems: "이 모둠 미션에 필요한 맞출 아이템을 모두 골라 제출하세요.",
  missionInvalidItem: "이 모둠 미션에 쓸 수 없는 맞출 아이템이에요.",
  missionAlreadyDone: "이미 완료한 모둠 미션이에요.",
  finalAlreadySubmitted: "이미 최종 제출을 마쳤어요.",
  activityComplete: "모둠 미션을 모두 마쳤어요. 수고했어요!",
  operationFailed: "요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.",
} as const;

/** activity-pack 엔진·API 호환 */
export const PLAYER_MESSAGES = {
  defaultPackTitle: COPY_DEFAULTS.newActivityPackTitle,
  unknownItem: PLAYER_COPY.unknownItem,
  unknownTask: PLAYER_COPY.unknownMission,
  incorrectAnswer: PLAYER_COPY.incorrectItemAnswer,
  missingItems: PLAYER_COPY.missingItems,
  taskIncompleteSubmission: PLAYER_COPY.missionNeedsAllItems,
  taskInvalidItem: PLAYER_COPY.missionInvalidItem,
  taskAlreadyCompleted: PLAYER_COPY.missionAlreadyDone,
  submissionAlreadySent: PLAYER_COPY.finalAlreadySubmitted,
  operationFailed: PLAYER_COPY.operationFailed,
} as const;

export function acquireSuccessMessage(score: number) {
  return PLAYER_COPY.acquireSuccess(score);
}

export function taskCompleteMessage(title: string, score?: number) {
  return PLAYER_COPY.missionComplete(title, score);
}
