export type GamePhase =
  | "waiting"
  | "briefing"
  | "investigation"
  | "final_report"
  | "session_end";

export type TeamRecord = {
  id: string;
  session_id: string | null;
  name: string | null;
  found_clue_ids: string[];
  report_suspect_id: string | null;
  report_method: string | null;
  report_motive: string | null;
  report_decisive_clue: string | null;
  report_submitted_at: string | null;
};

export type PlayerRecord = {
  id: string;
  nickname: string | null;
  session_id: string | null;
  team_id: string | null;
  /** 세션 호스트가 시작한 뒤: 부장/차장/부원 */
  club_role: string | null;
  /** 조사 장소 맵 id — `locations` */
  investigation_location_id: string | null;
};

export type GameSession = {
  id: string;
  case_id: string | null;
  host_id: string | null;
  join_code: string;
  phase: GamePhase | string | null;
  is_active: boolean | null;
  created_at: string | null;
};
