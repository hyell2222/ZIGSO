export type GamePhase =
  | "waiting"
  | "briefing"
  | "investigation"
  | "resolution"
  | "session_end";

export type CharacterRecord = {
  id: string;
  scenario_id: string | null;
  name: string | null;
  role: string | null;
};

export type TeamRecord = {
  id: string;
  session_id: string | null;
  name: string | null;
  found_clue_ids: string[];
  is_solved: boolean | null;
  solved_at: string | null;
};

export type PlayerRecord = {
  id: string;
  nickname: string | null;
  session_id: string | null;
  team_id: string | null;
  character_id: string | null;
  is_solved: boolean | null;
  solved_at: string | null;
};

export type GameSession = {
  id: string;
  scenario_id: string | null;
  host_id: string | null;
  join_code: string;
  phase: GamePhase | string | null;
  is_active: boolean | null;
  created_at: string | null;
};
