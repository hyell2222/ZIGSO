/**
 * 직소(Jigsaw) 협동학습 구조 — 실제 좌석·모둠 안내 문구.
 * 팀 배정 후「홈 집단」, 단서 수집 시「전문가 집단」전환을 선생님·학생 UI에서 같이 쓴다.
 */
export const jigsawSeatingCopy = {
  teacherPanelTitle: "직소 구조 — 좌석·모둠 안내",
  homeGroupTerm: "홈 집단",
  expertGroupTerm: "전문가 집단",
  homeGroupExplain:
    "브리핑 단계에서는 같은 소속 팀원끼리 모여 앉아, 사건 정보와 팀 내 역할을 공유합니다.",
  expertGroupExplain:
    "조사(단서 수집) 단계에서는 같은 담당 구역(순찰 구역)을 맡은 학생들끼리 모여 앉아, 그 구역의 단서를 함께 살펴봅니다. (서로 다른 팀이어도 같은 구역이면 한 모둠입니다.)",
  briefingNowForTeacher:
    "지금은 브리핑입니다. 학생에게 같은 소속 팀끼리 모여 앉으라고 안내해 주세요 (홈 집단).",
  investigationNowForTeacher:
    "지금은 조사입니다. 학생에게 같은 담당 구역을 맡은 친구들끼리 자리를 옮겨 모이라고 안내해 주세요 (전문가 집단).",
  studentBriefingLead:
    "홈 집단: 같은 소속 팀 동료들과 한 자리에 모여 브리핑을 진행하세요.",
  studentBriefingSub:
    "조사 단계가 되면 선생님 안내에 따라, 같은 담당 구역을 맡은 친구들끼리 모일 예정입니다 (전문가 집단).",
  studentInvestigationWithZone: (zoneName: string) =>
    `전문가 집단: 담당 구역이 「${zoneName}」인 동료들(다른 팀이어도 같은 구역이면 함께)과 모여 앉아 이 구역 단서를 나누어 확인하세요.`,
  studentInvestigationNoZone:
    "전문가 집단: 같은 담당 구역(순찰 구역)을 맡은 동료들과 모여 앉아 해당 구역의 단서를 함께 살펴보세요.",
} as const;
