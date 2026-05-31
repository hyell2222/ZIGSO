/** 학생 참가 UI */
export const JOIN_COPY = {
  title: "활동 참가",
  description: "선생님이 알려준 참가 코드와 닉네임을 입력하세요.",
  submitLabel: "참가하기",
  pendingLabel: "확인 중…",
  resumeTitle: "다시 참가하기",
  resumeDescription:
    "이전 입장 기록이 있어요. 이어서 참가할지, 새 닉네임으로 들어갈지 선택하세요.",
  resumeContinueLabel: "이어서 참가하기",
  resumeNewNicknameLabel: "새 닉네임으로 입장",
  resumeNicknameHint: "닉네임을 확인한 뒤 다시 참가해 주세요.",
  nicknamePlaceholder: "수업에서 부를 이름",
  errors: {
    codeAndNicknameRequired: "참가 코드와 닉네임을 모두 입력해 주세요.",
    codeNotFound: "참가 코드를 찾을 수 없어요. 선생님께 다시 확인해 주세요.",
    codeRequired: "참가 코드를 입력해 주세요.",
    nicknameRequired: "닉네임을 입력해 주세요.",
  },
} as const;
