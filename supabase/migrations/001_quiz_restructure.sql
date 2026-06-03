-- =====================================================================
-- Migration: vocabulary jigsaw -> quiz-based jigsaw
-- Adds the individual_quiz phase and quiz-answer columns.
-- Safe to run on an existing database.
-- =====================================================================

-- sessions.phase: allow the new individual_quiz phase
alter table public.sessions drop constraint if exists sessions_phase_check;
alter table public.sessions add constraint sessions_phase_check
  check (phase in ('waiting', 'overview', 'expert_group', 'home_group', 'individual_quiz', 'results'));

-- groups: shared group-quiz answers (replaces worksheet_placements)
alter table public.groups add column if not exists group_quiz_answers jsonb not null default '[]'::jsonb;
alter table public.groups drop column if exists worksheet_placements;

-- players: individual-quiz answers (replaces word_cards) + submission timestamp
alter table public.players add column if not exists individual_quiz_answers jsonb not null default '[]'::jsonb;
alter table public.players add column if not exists individual_quiz_submitted_at timestamptz;
alter table public.players drop column if exists word_cards;
alter table public.players drop column if exists assigned_item_ids;
