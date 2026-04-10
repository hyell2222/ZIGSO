export type GamePhase =
  | "briefing"
  | "evidence"
  | "interrogation"
  | "deduction"
  | "verdict";

export type CharacterRecord = {
  id: string;
  scenario_id: string | null;
  name: string | null;
  role: string | null;
  information: Record<string, unknown> | null;
  alibi: string | null;
  motive: Record<string, unknown> | null;
};

export type PlayerRecord = {
  id: string;
  session_id: string | null;
  nickname: string | null;
  character_id: string | null;
  vote_character_id: string | null;
  joined_at: string | null;
};

export type GameSession = {
  id: string;
  scenario_id: string | null;
  host_id: string | null;
  join_code: string;
  phase: string | null;
  created_at: string | null;
};
