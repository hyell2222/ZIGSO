import { COPY_DEFAULTS } from "@/lib/copy/defaults";

/** API·폼 공통 오류 메시지 */
export const ERROR_COPY = {
  loginRequired: "수업을 시작하려면 로그인해 주세요.",
  signInRequired: "로그인이 필요합니다.",
  activityPackMissing:
    "이 활동에 콘텐츠가 없습니다. 활동 편집에서 역할·맞출 아이템·모둠 미션을 설정해 주세요.",
  sessionActivityMissing: "세션에 연결된 활동이 없습니다.",
  packLoadFailed: "활동 콘텐츠를 불러올 수 없습니다.",
  packParseFailed: "활동 콘텐츠를 읽을 수 없습니다.",
  packNoRoles: "활동에 역할이 없습니다.",
  activityAlreadyComplete: "이미 활동을 완료했습니다.",
  missionsIncomplete: (names: string[]) =>
    `아직 완료하지 않은 모둠 미션이 있습니다: ${names.join(", ")}`,
  lastPhase: "이미 마지막 단계입니다.",
  sandboxMissionsIncomplete: "아직 완료하지 않은 모둠 미션이 있습니다.",
} as const;

export function untitledActivityTitle() {
  return COPY_DEFAULTS.untitledActivity;
}
