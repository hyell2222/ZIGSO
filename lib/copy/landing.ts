import { RESEARCH_REPORT_TITLE, TARGET_GRADE_LABEL } from "@/lib/brand";

/** 대상·맥락 — 기능(직소·STAD·실시간 등)은 카드에서 설명 */
export const LANDING_EYEBROW = `${TARGET_GRADE_LABEL} · 온라인 협동학습 게임`;

/** 교육적 지향 — 구조·도구 세부는 LANDING_FEATURES */
export const LANDING_TAGLINE = "교실에서 참여·공유·협력을 이어 가는 협동학습";

export const LANDING_RESEARCH_TITLE = RESEARCH_REPORT_TITLE;

export const LANDING_FEATURES = [
  {
    title: "AI로 활동 생성",
    body: "주제·모둠 규모에 맞춰 AI가 역할, 5단계 단서, 맞출 아이템, 모둠 미션 초안을 생성합니다.",
  },
  {
    title: "직소·STAD 협동학습",
    body: "전문가 집단에서 단서로 맞출 아이템을 습득·공유하고, 홈 집단에서 모둠 미션을 협력해 해결합니다.",
  },
  {
    title: "실시간 동시 참여",
    body: "참가 코드로 동시 입장하고, 단계·모둠 미션 진행과 점수를 실시간으로 확인합니다.",
  },
] as const;
