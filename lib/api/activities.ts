"use client";

import type { ActivityPack } from "@/lib/activity-pack/types";
import { isValidActivityPack } from "@/lib/activity-pack/validate";
import { supabase } from "@/lib/supabase";

export type ActivityRecord = {
  id: string;
  title: string | null;
  description: string | null;
  activity_pack: ActivityPack | null;
  difficulty: string | null;
  task_count: number | null;
  group_size: number | null;
  creator_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

const ACTIVITY_SELECT =
  "id,title,description,activity_pack,difficulty,task_count,group_size,creator_id,created_at,updated_at";

const DB_DIFFICULTIES = ["Easy", "Normal", "Hard"] as const;
export type DifficultyLevel = (typeof DB_DIFFICULTIES)[number];

function normalizeText(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function coerceDifficulty(value: string | null | undefined): DifficultyLevel {
  const t = normalizeText(value);
  if (t && (DB_DIFFICULTIES as readonly string[]).includes(t)) return t as DifficultyLevel;
  return "Normal";
}

export function normalizeDifficultyValue(value: unknown): DifficultyLevel {
  if (typeof value !== "string") return "Normal";
  return coerceDifficulty(value);
}

const DIFFICULTY_LABEL_KO: Record<DifficultyLevel, string> = {
  Easy: "쉬움",
  Normal: "보통",
  Hard: "어려움",
};

export function formatDifficultyForUi(value: string | null | undefined): string {
  const level = coerceDifficulty(value);
  return DIFFICULTY_LABEL_KO[level];
}

export const DIFFICULTY_UI_OPTIONS = DB_DIFFICULTIES.map((value) => ({
  value,
  label: DIFFICULTY_LABEL_KO[value],
}));

export function parseActivityPack(raw: unknown): ActivityPack | null {
  if (!raw || typeof raw !== "object") return null;
  return isValidActivityPack(raw) ? (raw as ActivityPack) : null;
}

export type ActivityListRow = ActivityRecord;

export async function listActivities(teacherId: string) {
  const { data, error } = await supabase
    .from("activities")
    .select(ACTIVITY_SELECT)
    .eq("creator_id", teacherId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ActivityListRow[];
}

export type CreateActivityInput = {
  title: string;
  description: string;
  activity_pack: ActivityPack;
  difficulty: string | null;
  task_count: number;
  group_size: number;
  creator_id?: string | null;
};

export async function createActivity(input: CreateActivityInput) {
  const { data, error } = await supabase
    .from("activities")
    .insert({
      title: normalizeText(input.title),
      description: normalizeText(input.description) ?? "",
      activity_pack: input.activity_pack,
      difficulty: coerceDifficulty(input.difficulty),
      task_count: input.task_count,
      group_size: input.group_size,
      creator_id: input.creator_id ?? null,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data?.id as string;
}

export async function getActivity(activityId: string): Promise<ActivityRecord> {
  const { data, error } = await supabase
    .from("activities")
    .select(ACTIVITY_SELECT)
    .eq("id", activityId)
    .single();
  if (error) throw error;
  return data as ActivityRecord;
}

export async function updateActivity(
  activityId: string,
  input: Omit<CreateActivityInput, "creator_id">,
) {
  const { error } = await supabase
    .from("activities")
    .update({
      title: normalizeText(input.title),
      description: normalizeText(input.description) ?? "",
      activity_pack: input.activity_pack,
      difficulty: coerceDifficulty(input.difficulty),
      task_count: input.task_count,
      group_size: input.group_size,
      updated_at: new Date().toISOString(),
    })
    .eq("id", activityId);
  if (error) throw error;
}

export async function deleteActivity(activityId: string) {
  const { error } = await supabase.from("activities").delete().eq("id", activityId);
  if (error) throw error;
}

export {
  advanceSessionPhase,
  beginHostingSession,
  deleteSession,
  endSession,
  getNextPhase,
  listHostSessions,
  startSession,
  type HostSessionListRow,
  type ActivityPhase,
  type SessionStatus,
  type StartedSession,
} from "@/lib/api/sessions";
