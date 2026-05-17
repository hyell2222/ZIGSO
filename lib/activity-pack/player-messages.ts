export const PLAYER_MESSAGES = {
  defaultPackTitle: "새 직소 활동",
  unknownItem: "항목을 찾을 수 없습니다.",
  unknownTask: "미션을 찾을 수 없습니다.",
  incorrectAnswer: "정답이 아닙니다. 힌트를 다시 확인해 보세요.",
  missingItems: "아직 모둠이 획득하지 않은 항목이 있습니다.",
  taskIncompleteSubmission: "필수 제출 항목을 모두 포함해야 미션을 완료할 수 있습니다.",
  taskInvalidItem: "이 미션에 사용할 수 없는 항목입니다.",
  taskAlreadyCompleted: "이미 완료한 미션입니다.",
  submissionAlreadySent: "이미 최종 제출했습니다.",
  operationFailed: "요청을 처리하지 못했습니다.",
} as const;

export function acquireSuccessMessage(score: number) {
  return `정답! +${score}점`;
}

export function taskCompleteMessage(title: string, score?: number) {
  if (typeof score === "number") {
    return `「${title}」미션 완료! +${score}점`;
  }
  return `「${title}」미션 완료!`;
}
