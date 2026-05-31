import { RESEARCH_REPORT_TITLE, TARGET_GRADE_LABEL } from "@/lib/brand";

export const LANDING_EYEBROW = `${TARGET_GRADE_LABEL} · 직소·STAD 협동학습`;

/** 게임 핵심 루프: 전문가 집단(맞출 아이템) → 홈 집단(모둠 미션) */
export const LANDING_TAGLINE =
  "전문가 집단에서 맞출 아이템을 찾고, 홈 집단에서 모둠 미션을 완성합니다.";

export const LANDING_RESEARCH_TITLE = RESEARCH_REPORT_TITLE;

export const LANDING_FEATURES = [
  {
    title: "AI 활동 설계",
    body: "주제·모둠 규모로 역할·5단계 단서·모둠 미션 초안",
  },
  {
    title: "직소·STAD 4단계",
    body: "활동 소개 → 전문가 집단 → 홈 집단 → 활동 결과",
  },
  {
    title: "수업 진행 패널",
    body: "참가 코드·단계 타이머·모둠 미션 현황",
  },
] as const;
