"use client";

import { parseScenarioPack, type LessonRecord } from "@/lib/api/lessons";
import { assignTeamsAndIngredients } from "@/lib/api/play";
import { supabase } from "@/lib/supabase";

export type StartedSession = {
  sessionId: string;
  joinCode: string;
  sessionTitle: string;
};

export type SessionPhase =
  | "waiting"
  | "briefing"
  | "investigation"
  | "final_report"
  | "session_end";

function generateJoinCode(length: number) {
  return Math.random().toString(36).slice(2, 2 + length).toUpperCase();
}

export type HostSessionListRow = {
  id: string;
  join_code: string;
  phase: string | null;
  is_active: boolean | null;
  created_at: string | null;
  lesson_id: string | null;
  lessons: { title: string | null } | null;
};

export async function listHostSessions(hostId: string) {
  const { data, error } = await supabase
    .from("sessions")
    .select("id,join_code,phase,is_active,created_at,lesson_id,lessons(title)")
    .eq("host_id", hostId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const raw = (data ?? []) as Array<
    Omit<HostSessionListRow, "lessons"> & {
      lessons: { title: string | null } | { title: string | null }[] | null;
    }
  >;
  return raw.map((r) => {
    const lesson = Array.isArray(r.lessons) ? r.lessons[0] ?? null : r.lessons;
    return { ...r, lessons: lesson } satisfies HostSessionListRow;
  });
}

export async function startSession(lesson: LessonRecord, hostId?: string | null) {
  if (!hostId) {
    throw new Error("플레이 세션을 시작하려면 로그인해 주세요.");
  }
  const pack = parseScenarioPack(lesson.scenario_pack);
  if (!pack) {
    throw new Error("이 수업에 급식 시나리오가 없습니다. 수업 편집에서 메뉴·재료를 설정해 주세요.");
  }

  const joinCode = generateJoinCode(6);
  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .insert({
      lesson_id: lesson.id,
      host_id: hostId,
      join_code: joinCode,
      phase: "waiting",
      is_active: true,
    })
    .select("id,join_code")
    .single();

  if (sessionError) throw sessionError;

  return {
    sessionId: session.id,
    joinCode: session.join_code,
    sessionTitle: lesson.title ?? "Untitled session",
  } satisfies StartedSession;
}

const HOST_PHASE_PROGRESSION: Array<"briefing" | "investigation" | "final_report"> = [
  "briefing",
  "investigation",
  "final_report",
];

export function getNextPhase(current: string | null): SessionPhase | null {
  const c = (current as SessionPhase) ?? "waiting";
  if (c === "waiting" || c === "session_end") return null;
  const idx = HOST_PHASE_PROGRESSION.indexOf(c);
  if (idx < 0) return null;
  if (idx === HOST_PHASE_PROGRESSION.length - 1) return "session_end";
  return HOST_PHASE_PROGRESSION[idx + 1]!;
}

export async function beginHostingSession(sessionId: string) {
  const { data: sess, error: se } = await supabase
    .from("sessions")
    .select("lesson_id")
    .eq("id", sessionId)
    .single();
  if (se) throw se;
  if (!sess?.lesson_id) throw new Error("세션에 연결된 수업이 없습니다.");

  const { data: lesson, error: le } = await supabase
    .from("lessons")
    .select("scenario_pack")
    .eq("id", sess.lesson_id)
    .single();
  if (le) throw le;
  const pack = parseScenarioPack(lesson?.scenario_pack);
  if (!pack) throw new Error("급식 시나리오를 불러올 수 없습니다.");

  await assignTeamsAndIngredients(sessionId, pack);
  const { error } = await supabase
    .from("sessions")
    .update({ phase: "briefing" })
    .eq("id", sessionId);
  if (error) throw error;
}

export async function endSession(sessionId: string) {
  const { error } = await supabase
    .from("sessions")
    .update({ phase: "session_end", is_active: false })
    .eq("id", sessionId);
  if (error) throw error;
}

export async function advanceSessionPhase(sessionId: string, nextPhase: SessionPhase) {
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
