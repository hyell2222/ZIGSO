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
  session_id: string | null;
  character_id: string;
  name: string | null;
};

export type GameSession = {
  id: string;
  scenario_id: string | null;
  host_id: string | null;
  join_code: string;
  max_teams: number | null;
  started_at: string | null;
  ended_at: string | null;
  created_at: string | null;
};
