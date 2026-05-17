export const PLAYER_MESSAGES = {
  defaultPackTitle: "새 직소 활동",
  unknownItem: "항목을 찾을 수 없습니다.",
  unknownTask: "과제를 찾을 수 없습니다.",
  incorrectAnswer: "정답이 아닙니다. 힌트를 다시 확인해 보세요.",
  missingItems: "이 과제에 필요한 항목을 아직 모두 맞추지 않았습니다.",
  taskStepsMismatch: "수행 순서가 맞지 않습니다.",
  taskAlreadyCompleted: "이미 완료한 과제입니다.",
  submissionAlreadySent: "이미 최종 제출했습니다.",
  operationFailed: "요청을 처리하지 못했습니다.",
} as const;

export function acquireSuccessMessage(score: number) {
  return `정답! +${score}점`;
}

export function taskCompleteMessage(taskName: string, score?: number) {
  if (typeof score === "number") {
    return `「${taskName}」과제 완료! +${score}점`;
  }
  return `「${taskName}」과제 완료!`;
}
