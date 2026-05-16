"use client";

import type { ScenarioPack } from "@/lib/lunch/types";
import { isValidScenarioPack } from "@/lib/lunch/validate";
import { supabase } from "@/lib/supabase";

export type LessonRecord = {
  id: string;
  title: string | null;
  description: string | null;
  scenario_pack: ScenarioPack | null;
  difficulty: string | null;
  english_level: string | null;
  menu_count: number | null;
  team_size: number | null;
  creator_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

const LESSON_SELECT =
  "id,title,description,scenario_pack,difficulty,english_level,menu_count,team_size,creator_id,created_at,updated_at";

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

export function parseScenarioPack(raw: unknown): ScenarioPack | null {
  if (!raw || typeof raw !== "object") return null;
  return isValidScenarioPack(raw) ? (raw as ScenarioPack) : null;
}

export type LessonListRow = LessonRecord;

export async function listLessons(teacherId: string) {
  const { data, error } = await supabase
    .from("lessons")
    .select(LESSON_SELECT)
    .eq("creator_id", teacherId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as LessonListRow[];
}

export type CreateLessonInput = {
  title: string;
  description: string;
  scenario_pack: ScenarioPack;
  difficulty: string | null;
  english_level: string | null;
  menu_count: number;
  team_size: number;
  creator_id?: string | null;
};

export async function createLesson(input: CreateLessonInput) {
  const { data, error } = await supabase
    .from("lessons")
    .insert({
      title: normalizeText(input.title),
      description: normalizeText(input.description) ?? "",
      scenario_pack: input.scenario_pack,
      difficulty: coerceDifficulty(input.difficulty),
      english_level: normalizeText(input.english_level) ?? "A2",
      menu_count: input.menu_count,
      team_size: input.team_size,
      creator_id: input.creator_id ?? null,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data?.id as string;
}

export async function getLesson(lessonId: string): Promise<LessonRecord> {
  const { data, error } = await supabase
    .from("lessons")
    .select(LESSON_SELECT)
    .eq("id", lessonId)
    .single();
  if (error) throw error;
  return data as LessonRecord;
}

export async function updateLesson(lessonId: string, input: Omit<CreateLessonInput, "creator_id">) {
  const { error } = await supabase
    .from("lessons")
    .update({
      title: normalizeText(input.title),
      description: normalizeText(input.description) ?? "",
      scenario_pack: input.scenario_pack,
      difficulty: coerceDifficulty(input.difficulty),
      english_level: normalizeText(input.english_level) ?? "A2",
      menu_count: input.menu_count,
      team_size: input.team_size,
      updated_at: new Date().toISOString(),
    })
    .eq("id", lessonId);
  if (error) throw error;
}

export async function deleteLesson(lessonId: string) {
  const { error } = await supabase.from("lessons").delete().eq("id", lessonId);
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
  type SessionPhase,
  type StartedSession,
} from "@/lib/api/sessions";
