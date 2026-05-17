import type { ActivityPhase } from "@/lib/types";

/** 호스트가 진행 중 머무를 수 있는 단계(타이머·다음 단계가 의미 있는 단계). */
export type TimedPhase = Exclude<ActivityPhase, "waiting" | "results">;

export type StepDef = {
  key: TimedPhase;
  number: number;
  label: string;
};

export const PHASES: StepDef[] = [
  { key: "overview", number: 1, label: "활동 소개" },
  { key: "expert_group", number: 2, label: "전문가 집단" },
  { key: "home_group", number: 3, label: "팀 협업" },
];

export type PhaseGuide = {
  title: string;
  summary: string;
};

export const PHASE_GUIDES: Record<TimedPhase, PhaseGuide> = {
  overview: {
    title: "활동 소개",
    summary: "팀별로 모여 오늘의 과제와 역할을 확인합니다.",
  },
  expert_group: {
    title: "전문가 집단",
    summary:
      "같은 전문가끼리 모여 힌트로 정보를 추리하고, 조로 돌아와 팀과 공유합니다.",
  },
  home_group: {
    title: "팀 협업",
    summary: "획득한 정보로 팀 과제를 완성하고 최종 결과를 제출합니다.",
  },
};

export const PHASE_MINUTES: Record<TimedPhase, number> = {
  overview: 8,
  expert_group: 15,
  home_group: 12,
};

export function isTimedPhase(phase: ActivityPhase): phase is TimedPhase {
  return phase !== "waiting" && phase !== "results";
}
