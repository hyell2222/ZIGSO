"use client";

import { parseActivityPack, type ActivityRecord } from "@/lib/api/activities";
import { ERROR_COPY } from "@/lib/copy/errors";
import { COPY_DEFAULTS } from "@/lib/copy/defaults";
import { assignGroupsAndRoles } from "@/lib/api/play";
import type { ActivityPhase, SessionStatus } from "@/lib/types";
import { supabase } from "@/lib/supabase";

export type { ActivityPhase, SessionStatus };

export type StartedSession = {
  sessionId: string;
  joinCode: string;
  sessionTitle: string;
};

function generateJoinCode(length: number) {
  return Math.random().toString(36).slice(2, 2 + length).toUpperCase();
}

export type HostSessionListRow = {
  id: string;
  join_code: string;
  phase: string | null;
  status: SessionStatus | string | null;
  created_at: string | null;
  activity_id: string | null;
  activities: { title: string | null } | null;
};

export async function listHostSessions(hostId: string) {
  const { data, error } = await supabase
    .from("sessions")
    .select("id,join_code,phase,status,created_at,activity_id,activities(title)")
    .eq("host_id", hostId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const raw = (data ?? []) as Array<
    Omit<HostSessionListRow, "activities"> & {
      activities: { title: string | null } | { title: string | null }[] | null;
    }
  >;
  return raw.map((r) => {
    const activity = Array.isArray(r.activities) ? r.activities[0] ?? null : r.activities;
    return { ...r, activities: activity } satisfies HostSessionListRow;
  });
}

export async function startSession(activity: ActivityRecord, hostId?: string | null) {
  if (!hostId) {
    throw new Error(ERROR_COPY.loginRequired);
  }
  const pack = parseActivityPack(activity.activity_pack);
  if (!pack) {
    throw new Error(ERROR_COPY.activityPackMissing);
  }

  const joinCode = generateJoinCode(6);
  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .insert({
      activity_id: activity.id,
      host_id: hostId,
      join_code: joinCode,
      phase: "waiting",
      status: "active",
    })
    .select("id,join_code")
    .single();

  if (sessionError) throw sessionError;

  return {
    sessionId: session.id,
    joinCode: session.join_code,
    sessionTitle: activity.title ?? COPY_DEFAULTS.untitledActivity,
  } satisfies StartedSession;
}

const HOST_PHASE_PROGRESSION: Array<
  "overview" | "expert_group" | "home_group"
> = ["overview", "expert_group", "home_group"];

export function getNextPhase(current: string | null): ActivityPhase | null {
  const c = (current as ActivityPhase) ?? "waiting";
  if (c === "waiting" || c === "results") return null;
  const idx = HOST_PHASE_PROGRESSION.indexOf(c as (typeof HOST_PHASE_PROGRESSION)[number]);
  if (idx < 0) return null;
  if (idx === HOST_PHASE_PROGRESSION.length - 1) return "results";
  return HOST_PHASE_PROGRESSION[idx + 1]!;
}

export async function beginHostingSession(sessionId: string) {
  const { data: sess, error: se } = await supabase
    .from("sessions")
    .select("activity_id")
    .eq("id", sessionId)
    .single();
  if (se) throw se;
  if (!sess?.activity_id) throw new Error(ERROR_COPY.sessionActivityMissing);

  const { data: activity, error: le } = await supabase
    .from("activities")
    .select("activity_pack")
    .eq("id", sess.activity_id)
    .single();
  if (le) throw le;
  const pack = parseActivityPack(activity?.activity_pack);
  if (!pack) throw new Error(ERROR_COPY.packLoadFailed);

  await assignGroupsAndRoles(sessionId, pack);
  const { error } = await supabase
    .from("sessions")
    .update({ phase: "overview" })
    .eq("id", sessionId);
  if (error) throw error;
}

/** 세션 종료 — `status`만 `ended`로 바꿉니다. 활동 4단계(`results`)와는 별개입니다. */
export async function endSession(sessionId: string) {
  const { error } = await supabase
    .from("sessions")
    .update({ status: "ended" })
    .eq("id", sessionId);
  if (error) throw error;
}

export async function advanceSessionPhase(sessionId: string, nextPhase: ActivityPhase) {
  const { error } = await supabase
    .from("sessions")
    .update({ phase: nextPhase })
    .eq("id", sessionId);
  if (error) throw error;
}

export async function deleteSession(sessionId: string) {
  const { error } = await supabase.from("sessions").delete().eq("id", sessionId);
  if (error) throw error;
}
