import type { CasePhase } from "@/lib/api/cases";

/** 호스트가 진행 중 머무를 수 있는 단계(타이머·다음 단계가 의미 있는 단계). */
export type TimedPhase = Exclude<CasePhase, "waiting" | "session_end">;

export type StepDef = {
  key: TimedPhase;
  number: number;
  label: string;
};

export const PHASES: StepDef[] = [
  { key: "briefing", number: 1, label: "사건 파악" },
  { key: "investigation", number: 2, label: "단서 수집" },
  { key: "final_report", number: 3, label: "범인 지목" },
];

export type PhaseGuide = {
  title: string;
  summary: string;
};

export const PHASE_GUIDES: Record<TimedPhase, PhaseGuide> = {
  briefing: {
    title: "사건 파악",
    summary: "팀별로 모여 사건 파일과 용의자 프로필을 확인합니다.",
  },
  investigation: {
    title: "단서 수집",
    summary: "배정 장소를 탐색하고 단서를 수집합니다.",
  },
  final_report: {
    title: "범인 지목",
    summary: "팀 토의 후 범인을 지목합니다.",
  },
};

export const PHASE_MINUTES: Record<TimedPhase, number> = {
  briefing: 10,
  investigation: 12,
  final_report: 10,
};

export function isTimedPhase(phase: CasePhase): phase is TimedPhase {
  return phase !== "waiting" && phase !== "session_end";
}
