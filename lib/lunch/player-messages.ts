/** 학생·교사 화면에 노출되는 게임 메시지 */

export const PLAYER_MESSAGES = {
  unknownIngredient: "알 수 없는 재료입니다.",
  incorrectAnswer: "정답이 아닙니다. 다시 시도하거나 다음 힌트를 열어 보세요.",
  unknownMenu: "알 수 없는 메뉴입니다.",
  missingIngredients: "이 메뉴에 필요한 재료를 팀이 모두 모으지 못했습니다.",
  cookingStepsMismatch: "조리 순서나 문장이 맞지 않습니다. 순서와 영어 문장을 확인하세요.",
  menuAlreadyCompleted: "이 메뉴는 이미 완성했습니다.",
  submitFailed: "제출하지 못했습니다. 다시 시도해 주세요.",
  operationFailed: "처리에 실패했습니다. 다시 시도해 주세요.",
  defaultPackTitle: "스쿨 런치 러시",
} as const;

export function acquireSuccessMessage(score: number): string {
  return `정답입니다! ${score}점을 획득했어요. 조로 돌아가 팀원에게 재료를 알려 주세요.`;
}

export function menuCompleteMessage(menuName: string): string {
  return `「${menuName}」 메뉴를 완성했습니다!`;
}
