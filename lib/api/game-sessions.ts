"use client";

import { supabase } from "@/lib/supabase";
import type { CaseRecord } from "@/lib/api/cases";
import { assignTeamsAndInvestigation } from "@/lib/api/play";

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

export type HostSessionListRow = {
  id: string;
  join_code: string;
  phase: string | null;
  is_active: boolean | null;
  created_at: string | null;
  case_id: string | null;
  cases: { title: string | null } | null;
};

/** 로그인한 교사(`host_id`)가 연 세션 — 최신순 */
export async function listHostSessions(hostId: string) {
  const { data, error } = await supabase
    .from("game_sessions")
    .select("id,join_code,phase,is_active,created_at,case_id,cases(title)")
    .eq("host_id", hostId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const raw = (data ?? []) as Array<
    Omit<HostSessionListRow, "cases"> & {
      cases: { title: string | null } | { title: string | null }[] | null;
    }
  >;
  return raw.map((r) => {
    const c = r.cases;
    const caseRow = Array.isArray(c) ? c[0] ?? null : c;
    return { ...r, cases: caseRow } satisfies HostSessionListRow;
  });
}

export async function startGameSession(caseRecord: CaseRecord, hostId?: string | null) {
  if (!hostId) {
    throw new Error("수사 세션을 시작하려면 로그인해 주세요.");
  }

  const { data: locRows, error: locError } = await supabase
    .from("locations")
    .select("id")
    .eq("case_id", caseRecord.id);

  if (locError) throw locError;
  if (!locRows?.length) {
    throw new Error("이 사건에 조사 장소이 없습니다. 맵 에디터에서 장소을 추가하세요.");
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

/** 호스트가 `advanceSessionPhase`로 넘길 수 있는 진행 단계 (waiting 은 begin, session_end 는 종료) */
const HOST_PHASE_PROGRESSION: Array<"briefing" | "investigation" | "final_report"> = [
  "briefing",
  "investigation",
  "final_report",
];

export function getNextPhase(current: string | null): CasePhase | null {
  const c = (current as CasePhase) ?? "waiting";
  if (c === "waiting" || c === "session_end") return null;
  const idx = HOST_PHASE_PROGRESSION.indexOf(c);
  if (idx < 0) return null;
  if (idx === HOST_PHASE_PROGRESSION.length - 1) return "session_end";
  return HOST_PHASE_PROGRESSION[idx + 1]!;
}

export async function beginHostingSession(sessionId: string) {
  await assignTeamsAndInvestigation(sessionId);
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
  const { error } = await supabase
    .from("game_sessions")
    .update({ phase: nextPhase })
    .eq("id", sessionId);
  if (error) throw error;
}

/** 호스트만 삭제 가능(RLS). 팀·플레이어는 FK `on delete cascade`로 함께 제거됩니다. */
export async function deleteGameSession(sessionId: string) {
  const { error } = await supabase.from("game_sessions").delete().eq("id", sessionId);
  if (error) throw error;
}
