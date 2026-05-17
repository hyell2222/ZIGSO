import type { AcquiredItem, CompletedTask, ActivityPack } from "@/lib/activity-pack/types";

export type ActivityPhase =
  | "waiting"
  | "overview"
  | "expert_group"
  | "home_group"
  | "results";

export type SessionStatus = "active" | "ended";

export type GroupRecord = {
  id: string;
  session_id: string | null;
  name: string | null;
  acquired_items: AcquiredItem[];
  completed_tasks: CompletedTask[];
  completed_at: string | null;
};

export type PlayerRecord = {
  id: string;
  nickname: string | null;
  session_id: string | null;
  group_id: string | null;
  assigned_role_id: string | null;
};

export type GameSession = {
  id: string;
  activity_id: string | null;
  host_id: string | null;
  join_code: string;
  phase: ActivityPhase | string | null;
  status: SessionStatus | string | null;
  created_at: string | null;
};

export function isSessionEnded(session: {
  phase?: string | null;
  status?: string | null;
}): boolean {
  return session.status === "ended" || session.phase === "results";
}

export type { ActivityPack, AcquiredItem, CompletedTask };
