"use client";

import type { ActivityPack } from "@/lib/activity-pack/types";
import { parseActivityPack as parsePack } from "@/lib/activity-pack/parse";
import { supabase } from "@/lib/supabase";

export type ActivityRecord = {
  id: string;
  title: string | null;
  activity_pack: ActivityPack | null;
  creator_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

const ACTIVITY_SELECT =
  "id,title,activity_pack,creator_id,created_at,updated_at";

function normalizeText(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function parseActivityPack(raw: unknown): ActivityPack | null {
  return parsePack(raw);
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

export type ActivityId = string;

export type CreateActivityInput = {
  title: string;
  activity_pack: ActivityPack;
  creator_id?: string | null;
};

export async function createActivity(input: CreateActivityInput) {
  const { data, error } = await supabase
    .from("activities")
    .insert({
      title: normalizeText(input.title),
      activity_pack: input.activity_pack,
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
      activity_pack: input.activity_pack,
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
} from "@/lib/api/sessions";
