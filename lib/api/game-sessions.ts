"use client";

import { supabase } from "@/lib/supabase";
import type { CaseRecord } from "@/lib/api/cases";
import { assignTeamsAndPatrol } from "@/lib/api/play";

export type StartedGameSession = {
  sessionId: string;
  joinCode: string;
  caseTitle: string;
};

export type CasePhase =
  | "waiting"
  | "briefing"
  | "investigation"
  | "final_report"
  | "session_end";

function generateJoinCode(length: number) {
  return Math.random().toString(36).slice(2, 2 + length).toUpperCase();
}

export async function startGameSession(caseRecord: CaseRecord, hostId?: string | null) {
  if (!hostId) {
    throw new Error("You must be signed in to start a game.");
  }

  const { data: locRows, error: locError } = await supabase
    .from("locations")
    .select("id")
    .eq("case_id", caseRecord.id);

  if (locError) throw locError;
  if (!locRows?.length) {
    throw new Error("이 시나리오에 조사 구역(맵)이 없습니다. 맵 에디터에서 구역을 추가하세요.");
  }

  const joinCode = generateJoinCode(6);
  const { data: session, error: sessionError } = await supabase
    .from("game_sessions")
    .insert({
      case_id: caseRecord.id,
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
    caseTitle: caseRecord.title ?? "Untitled case",
  } satisfies StartedGameSession;
}

const PHASE_ORDER: CasePhase[] = ["briefing", "investigation", "final_report"];

export function getNextPhase(current: string | null): CasePhase | null {
  if (current === "waiting" || current === "session_end") return null;
  if (current === "final_report") return "session_end";
  const idx = PHASE_ORDER.indexOf((current as CasePhase) ?? "briefing");
  if (idx < 0 || idx >= PHASE_ORDER.length - 1) return null;
  return PHASE_ORDER[idx + 1]!;
}

export async function beginHostingSession(sessionId: string) {
  await assignTeamsAndPatrol(sessionId);
  const { error } = await supabase
    .from("game_sessions")
    .update({ phase: "briefing" })
    .eq("id", sessionId);
  if (error) throw error;
}

export async function endSession(sessionId: string) {
  const { error } = await supabase
    .from("game_sessions")
    .update({ phase: "session_end", is_active: false })
    .eq("id", sessionId);
  if (error) throw error;
}

export async function advanceSessionPhase(sessionId: string, nextPhase: CasePhase) {
  if (nextPhase === "session_end") {
    await endSession(sessionId);
    return;
  }
  const { error } = await supabase
    .from("game_sessions")
    .update({ phase: nextPhase })
    .eq("id", sessionId);
  if (error) throw error;
}
