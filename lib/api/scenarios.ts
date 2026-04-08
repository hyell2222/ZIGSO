"use client";

import { supabase } from "@/lib/supabase";

export type ScenarioRecord = {
  id: string;
  title: string | null;
  description: string | null;
  character_count: number | null;
  difficulty: string | null;
  data: Record<string, unknown> | null;
  teacher_id?: string | null;
};

type CreateScenarioInput = {
  title: string | null;
  description: string | null;
  character_count: number | null;
  difficulty: string | null;
  data: Record<string, unknown> | null;
  teacher_id?: string | null;
};

export async function listScenarios(teacherId: string) {
  // #region agent log
  fetch("http://127.0.0.1:7749/ingest/bf6ab18c-c394-4192-9205-66b8beb594f8", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "55cc55",
    },
    body: JSON.stringify({
      sessionId: "55cc55",
      runId: "empty-scenarios-pre-fix",
      hypothesisId: "H2",
      location: "lib/api/scenarios.ts:25",
      message: "listScenarios called",
      data: {
        teacherId,
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
  const { data, error } = await supabase
    .from("scenarios")
    .select("id,title,description,character_count,difficulty,data,teacher_id")
    .eq("teacher_id", teacherId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  // #region agent log
  fetch("http://127.0.0.1:7749/ingest/bf6ab18c-c394-4192-9205-66b8beb594f8", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "55cc55",
    },
    body: JSON.stringify({
      sessionId: "55cc55",
      runId: "empty-scenarios-pre-fix",
      hypothesisId: "H2",
      location: "lib/api/scenarios.ts:41",
      message: "listScenarios filtered result",
      data: {
        teacherId,
        count: data?.length ?? 0,
        teacherIds: (data ?? []).slice(0, 5).map((scenario) => scenario.teacher_id ?? null),
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
  if ((data?.length ?? 0) === 0) {
    const [{ count: totalCount }, { count: nullTeacherCount }, { data: sampleRows }] = await Promise.all([
      supabase.from("scenarios").select("*", { count: "exact", head: true }),
      supabase.from("scenarios").select("*", { count: "exact", head: true }).is("teacher_id", null),
      supabase.from("scenarios").select("id,teacher_id").order("created_at", { ascending: false }).limit(5),
    ]);
    // #region agent log
    fetch("http://127.0.0.1:7749/ingest/bf6ab18c-c394-4192-9205-66b8beb594f8", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "55cc55",
      },
      body: JSON.stringify({
        sessionId: "55cc55",
        runId: "empty-scenarios-pre-fix",
        hypothesisId: "H4",
        location: "lib/api/scenarios.ts:61",
        message: "listScenarios empty diagnostics",
        data: {
          teacherId,
          totalCount: totalCount ?? 0,
          nullTeacherCount: nullTeacherCount ?? 0,
          sampleTeacherIds: (sampleRows ?? []).map((scenario) => scenario.teacher_id ?? null),
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
  }
  return (data ?? []) as ScenarioRecord[];
}

export {
  advanceSessionPhase,
  beginHostingSession,
  endSession,
  getNextPhase,
  type ScenarioPhase,
  startGameSession,
} from "@/lib/api/game-sessions";
export type { StartedGameSession } from "@/lib/api/game-sessions";

export async function createScenario(input: CreateScenarioInput) {
  // #region agent log
  fetch("http://127.0.0.1:7749/ingest/bf6ab18c-c394-4192-9205-66b8beb594f8", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "55cc55",
    },
    body: JSON.stringify({
      sessionId: "55cc55",
      runId: "empty-scenarios-pre-fix",
      hypothesisId: "H3",
      location: "lib/api/scenarios.ts:84",
      message: "createScenario insert payload",
      data: {
        teacherId: input.teacher_id ?? null,
        hasTitle: Boolean(input.title?.trim()),
        hasDescription: Boolean(input.description?.trim()),
        characterCount: input.character_count ?? null,
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
  const { error } = await supabase.from("scenarios").insert(input);
  if (error) throw error;
}
