import type { SessionPhase } from "@/lib/api/lessons";

/** 호스트가 진행 중 머무를 수 있는 단계(타이머·다음 단계가 의미 있는 단계). */
export type TimedPhase = Exclude<SessionPhase, "waiting" | "session_end">;

export type StepDef = {
  key: TimedPhase;
  number: number;
  label: string;
};

export const PHASES: StepDef[] = [
  { key: "briefing", number: 1, label: "오늘의 급식 브리핑" },
  { key: "investigation", number: 2, label: "재료 전문가 활동" },
  { key: "final_report", number: 3, label: "급식판 완성" },
];

export type PhaseGuide = {
  title: string;
  summary: string;
};

export const PHASE_GUIDES: Record<TimedPhase, PhaseGuide> = {
  briefing: {
    title: "오늘의 급식 브리핑",
    summary: "팀별로 모여 오늘의 급식 메뉴와 역할을 확인합니다.",
  },
  investigation: {
    title: "재료 전문가 활동",
    summary:
      "같은 재료 전문가끼리 모여 영어 힌트로 재료를 추리하고, 조로 돌아와 재료를 공유합니다.",
  },
  final_report: {
    title: "급식판 완성",
    summary: "획득한 재료로 메뉴를 만들고 영어 명령문을 조합해 급식판을 제출합니다.",
  },
};

export const PHASE_MINUTES: Record<TimedPhase, number> = {
  briefing: 8,
  investigation: 15,
  final_report: 12,
};

export function isTimedPhase(phase: SessionPhase): phase is TimedPhase {
  return phase !== "waiting" && phase !== "session_end";
}
