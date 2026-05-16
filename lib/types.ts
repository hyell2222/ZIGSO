import type { AcquiredIngredient, CompletedMenu, ScenarioPack } from "@/lib/lunch/types";

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
  acquired_ingredients: AcquiredIngredient[];
  completed_menus: CompletedMenu[];
  tray_submitted_at: string | null;
};

export type PlayerRecord = {
  id: string;
  nickname: string | null;
  session_id: string | null;
  team_id: string | null;
  assigned_ingredient_id: string | null;
};

export type GameSession = {
  id: string;
  lesson_id: string | null;
  host_id: string | null;
  join_code: string;
  phase: GamePhase | string | null;
  is_active: boolean | null;
  created_at: string | null;
};

export type { ScenarioPack, AcquiredIngredient, CompletedMenu };
