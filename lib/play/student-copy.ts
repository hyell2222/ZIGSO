/** 학생 play·샌드박스 UI 문구 (범용 직소 활동) */

export const PLAY_STUDENT_COPY = {
  phaseOverview: {
    title: "활동 소개",
    description: "모둠 배정과 오늘 완성할 미션을 확인하세요. 정답은 힌트로만 추리합니다.",
    placeLabel: "배정 역할",
  },
  phaseExpert: {
    title: "전문가 집단",
    description:
      "같은 전문가끼리 모여 힌트를 공개하며 맞출 항목을 추리하세요. 맞히면 모둠으로 돌아가 공유합니다.",
    placeLabel: "배정 역할",
    acquiredReturn: "모둠으로 돌아가 모둠원에게 알려 주세요.",
  },
  phaseHome: {
    title: "홈 집단",
    description:
      "획득한 항목으로 미션을 완성하세요. 각 미션마다 정해진 항목을 모두 모아 한 번에 제출해야 합니다.",
    scoreLabel: "모둠 점수",
  },
  waiting: {
    headerTitle: "활동 대기",
    headerDescription: "선생님이 시작할 때까지 잠시만 기다려 주세요.",
    loadingTitle: "준비 중",
    loadingBody: "활동 내용을 불러오고 있어요.",
    loadingEmoji: "⏳",
    waitingTitle: "곧 활동이 시작돼요!",
    waitingBody1: "선생님이 시작하면 모둠·담당 항목이 자동 배정돼요.",
    waitingBody2: "배정이 끝나면 같은 모둠끼리 모여 주세요.",
    waitingEmoji: "🧩",
    waitForTeacher: "선생님이 다음 단계로 진행할 때까지 기다려 주세요.",
  },
  intro: {
    timeHint: "제한 시간 안에 모둠 미션을 모두 완성하고 최종 제출하세요.",
  },
  phaseResults: {
    title: "활동 결과",
    subtitle: "모둠 순위와 나의 순위를 확인하세요.",
    emoji: "🏆",
    groupRankLabel: "모둠 순위",
    groupScoreLabel: "모둠 점수",
    personalRankLabel: "나의 순위",
    personalScoreLabel: "나의 점수",
    emptyMessage: "결과를 불러올 수 없습니다.",
  },
} as const;
