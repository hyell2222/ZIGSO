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

/** 부원 1명이 제출한 최종 범인 지목서. */
export type PlayerReportRecord = {
  id: string;
  session_id: string;
  team_id: string | null;
  player_id: string;
  /** cases.suspect_roster[].id */
  suspect_id: string;
  method: string;
  motive: string;
  decisive_clue: string;
  submitted_at: string;
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
