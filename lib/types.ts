export type GamePhase =
  | "briefing"
  | "evidence"
  | "interrogation"
  | "deduction"
  | "verdict";

export type TeamSubmission = {
  culprit: string;
  motive: string;
  method: string;
  timeline: string;
};

export type Team = {
  id: string;
  game_id: string;
  name: string;
  role: string;
  private_briefing: string;
  access_code: string;
};

export type Game = {
  id: string;
  title: string;
  grade_level: string;
  classroom_code: string;
  phase: GamePhase;
  public_briefing: string;
  ai_case_payload: Record<string, unknown> | null;
  created_by: string;
  created_at: string;
};
