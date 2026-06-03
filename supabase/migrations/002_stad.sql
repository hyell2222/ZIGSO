-- =====================================================================
-- Migration 002 — STAD restructure
-- Practice base score (expert phase) + formative test; drop group quiz.
-- Safe to run on a database already migrated by 001.
-- =====================================================================

-- players: STAD base score from expert practice
alter table public.players add column if not exists base_score int;
alter table public.players add column if not exists practice_wrong_attempts int;
alter table public.players add column if not exists practice_submitted_at timestamptz;

-- groups: group quiz removed (score is now STAD team average of members)
alter table public.groups drop column if exists group_quiz_answers;
alter table public.groups drop column if exists completed_at;
