"use client";

import type { SuspectEntry } from "@/lib/suspects";
import { supabase } from "@/lib/supabase";

export type CaseRecord = {
  id: string;
  title: string | null;
  description: string | null;
  suspect_roster: SuspectEntry[] | null;
  difficulty: string | null;
  /** cases.suspect_roster[].id */
  answer_suspect_id: string | null;
  creator_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type CaseLocationInput = {
  name?: string | null;
};

export type CaseClueProps = {
  x: number;
  y: number;
  asset?: string;
  /** 맵 에디터 기준 표시 크기(px), 격자 스냅 */
  w?: number;
  h?: number;
  /** 레거시: 칸 수만 저장된 경우 */
  tile_w?: number;
  tile_h?: number;
};

export type CaseClueInput = {
  name?: string | null;
  content?: string | null;
  location_id?: string | null;
  location_name?: string | null;
  props?: CaseClueProps | null;
};

type CreateCaseInput = {
  title: string | null;
  description: string | null;
  suspect_roster: SuspectEntry[];
  answer_suspect_id: string | null;
  difficulty: string | null;
  locations?: CaseLocationInput[];
  clues?: CaseClueInput[];
  creator_id?: string | null;
};

export type CaseLocationRow = {
  id: string;
  name: string | null;
};

export type CaseClueRow = {
  id: string;
  name: string | null;
  content: string | null;
  location_id: string | null;
  props: CaseClueProps | null;
};

export type CaseFullData = {
  caseRecord: CaseRecord;
  locations: CaseLocationRow[];
  clues: CaseClueRow[];
};

const CASE_SELECT =
  "id,title,description,suspect_roster,difficulty,answer_suspect_id,creator_id,created_at,updated_at";

function normalizeText(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/** DB `cases_difficulty_check` — 'Easy' | 'Normal' | 'Hard' 만 허용 */
const DB_DIFFICULTIES = ["Easy", "Normal", "Hard"] as const;
type DbDifficulty = (typeof DB_DIFFICULTIES)[number];

function coerceDifficultyForDb(value: string | null | undefined): DbDifficulty | null {
  const t = normalizeText(value);
  if (!t) return null;
  if ((DB_DIFFICULTIES as readonly string[]).includes(t)) return t as DbDifficulty;
  const legacyKr: Record<string, DbDifficulty> = {
    쉬움: "Easy",
    보통: "Normal",
    어려움: "Hard",
  };
  if (legacyKr[t]) return legacyKr[t];
  const lo = t.toLowerCase();
  if (lo === "easy") return "Easy";
  if (lo === "normal") return "Normal";
  if (lo === "hard") return "Hard";
  return "Normal";
}

/** UI·AI 응답 등 임의 값을 항상 DB 허용 값으로 */
export function normalizeDifficultyValue(value: unknown): DbDifficulty {
  if (typeof value !== "string") return "Normal";
  return coerceDifficultyForDb(value) ?? "Normal";
}

/** DB enum 과 동일 — 폼 value·저장 값 */
export type DifficultyLevel = DbDifficulty;

const DIFFICULTY_LABEL_KO: Record<DbDifficulty, string> = {
  Easy: "쉬움",
  Normal: "보통",
  Hard: "어려움",
};

/** 사건 목록·메타 등 UI 표시용 (DB는 영어 enum 유지) */
export function formatDifficultyForUi(value: string | null | undefined): string {
  const t = normalizeText(value);
  if (!t) return "—";
  const level = coerceDifficultyForDb(value);
  return level ? DIFFICULTY_LABEL_KO[level] : t;
}

export const DIFFICULTY_UI_OPTIONS: ReadonlyArray<{
  value: DbDifficulty;
  label: string;
}> = DB_DIFFICULTIES.map((value) => ({
  value,
  label: DIFFICULTY_LABEL_KO[value],
}));

function buildIdMap(rows: Array<{ id: string; name: string | null }>) {
  return new Map(
    rows
      .map((row) => [row.name?.trim().toLowerCase(), row.id] as const)
      .filter((entry): entry is [string, string] => Boolean(entry[0] && entry[1])),
  );
}

export type CaseListRow = CaseRecord & {
  /** PostgREST `locations(count)` */
  locations?: { count: number }[] | null;
};

export async function listCases(teacherId: string) {
  const { data, error } = await supabase
    .from("cases")
    .select(`${CASE_SELECT}, locations(count)`)
    .eq("creator_id", teacherId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as CaseListRow[];
}

export {
  advanceSessionPhase,
  beginHostingSession,
  endSession,
  getNextPhase,
  type CasePhase,
  startGameSession,
} from "@/lib/api/game-sessions";
export type { StartedGameSession } from "@/lib/api/game-sessions";

async function rebuildCaseChildren(
  caseId: string,
  locations: CaseLocationInput[],
  clues: CaseClueInput[],
) {
  const { data: insertedLocations, error: locationsError } = locations.length
    ? await supabase
        .from("locations")
        .insert(
          locations.map((location) => ({
            case_id: caseId,
            name: normalizeText(location.name),
          })),
        )
        .select("id,name")
    : { data: [], error: null };

  if (locationsError) throw locationsError;

  const locationIdsByName = buildIdMap(
    (insertedLocations ?? []) as Array<{ id: string; name: string | null }>,
  );

  if (clues.length) {
    const { error: cluesError } = await supabase.from("clues").insert(
      clues.map((clue) => ({
        case_id: caseId,
        name: normalizeText(clue.name),
        content: normalizeText(clue.content),
        location_id:
          normalizeText(clue.location_id) ??
          locationIdsByName.get(clue.location_name?.trim().toLowerCase() ?? "") ??
          null,
        props: clue.props ?? null,
      })),
    );
    if (cluesError) throw cluesError;
  }
}

export async function createCase(input: CreateCaseInput) {
  const locations = input.locations ?? [];
  const clues = input.clues ?? [];

  const { data: createdCase, error: caseError } = await supabase
    .from("cases")
    .insert({
      title: normalizeText(input.title),
      description: normalizeText(input.description),
      suspect_roster: input.suspect_roster,
      answer_suspect_id: normalizeText(input.answer_suspect_id),
      difficulty: coerceDifficultyForDb(input.difficulty),
      creator_id: input.creator_id ?? null,
    })
    .select("id")
    .single();

  if (caseError) throw caseError;
  if (!createdCase?.id) throw new Error("Case insert did not return id.");

  try {
    await rebuildCaseChildren(createdCase.id, locations, clues);
  } catch (error) {
    await supabase.from("cases").delete().eq("id", createdCase.id);
    throw error;
  }
}

export async function getCaseFull(caseId: string): Promise<CaseFullData> {
  const [caseRes, locationsRes, cluesRes] = await Promise.all([
    supabase.from("cases").select(CASE_SELECT).eq("id", caseId).single(),
    supabase
      .from("locations")
      .select("id,name")
      .eq("case_id", caseId)
      .order("name", { ascending: true }),
    supabase
      .from("clues")
      .select("id,name,content,location_id,props")
      .eq("case_id", caseId),
  ]);

  if (caseRes.error) throw caseRes.error;
  if (locationsRes.error) throw locationsRes.error;
  if (cluesRes.error) throw cluesRes.error;

  return {
    caseRecord: caseRes.data as CaseRecord,
    locations: (locationsRes.data ?? []) as CaseLocationRow[],
    clues: (cluesRes.data ?? []) as CaseClueRow[],
  };
}

export async function updateCase(
  caseId: string,
  input: Omit<CreateCaseInput, "creator_id">,
) {
  const locations = input.locations ?? [];
  const clues = input.clues ?? [];

  const { error: updateError } = await supabase
    .from("cases")
    .update({
      title: normalizeText(input.title),
      description: normalizeText(input.description),
      suspect_roster: input.suspect_roster,
      answer_suspect_id: normalizeText(input.answer_suspect_id),
      difficulty: coerceDifficultyForDb(input.difficulty),
      updated_at: new Date().toISOString(),
    })
    .eq("id", caseId);

  if (updateError) throw updateError;

  const cluesDel = await supabase.from("clues").delete().eq("case_id", caseId);
  if (cluesDel.error) throw cluesDel.error;
  const locDel = await supabase.from("locations").delete().eq("case_id", caseId);
  if (locDel.error) throw locDel.error;

  await rebuildCaseChildren(caseId, locations, clues);
}

export async function deleteCase(caseId: string) {
  const { error } = await supabase.from("cases").delete().eq("id", caseId);
  if (error) throw error;
}
