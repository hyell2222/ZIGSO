-- =====================================================================
-- Zigso STAD — single upgrade migration (current schema)
--
-- Run once on an existing Supabase project (vocabulary/worksheet, quiz,
-- or partial STAD). Idempotent: safe to re-run.
--
-- Target player columns:
--   base_score, practice_results, practice_submitted_at,
--   individual_quiz_answers, individual_quiz_submitted_at
--
-- Target group columns: id, session_id, name only (no group quiz).
-- Target session phase: includes individual_quiz
-- =====================================================================

-- ---------------------------------------------------------------------
-- sessions.phase
-- ---------------------------------------------------------------------
alter table public.sessions drop constraint if exists sessions_phase_check;
alter table public.sessions add constraint sessions_phase_check
  check (phase in (
    'waiting',
    'overview',
    'expert_group',
    'home_group',
    'individual_quiz',
    'results'
  ));

-- ---------------------------------------------------------------------
-- groups — remove legacy / group-quiz columns
-- ---------------------------------------------------------------------
alter table public.groups drop column if exists worksheet_placements;
alter table public.groups drop column if exists group_quiz_answers;
alter table public.groups drop column if exists completed_at;

-- ---------------------------------------------------------------------
-- players — remove legacy columns
-- ---------------------------------------------------------------------
alter table public.players drop column if exists word_cards;
alter table public.players drop column if exists assigned_item_ids;
alter table public.players drop column if exists practice_wrong_attempts;

-- ---------------------------------------------------------------------
-- players — STAD + formative test (add if missing)
-- ---------------------------------------------------------------------
alter table public.players add column if not exists individual_quiz_answers jsonb;
alter table public.players add column if not exists individual_quiz_submitted_at timestamptz;
alter table public.players add column if not exists base_score int;
alter table public.players add column if not exists practice_submitted_at timestamptz;
alter table public.players add column if not exists practice_results jsonb;

-- Defaults for jsonb columns (existing rows + new inserts)
update public.players
set individual_quiz_answers = '[]'::jsonb
where individual_quiz_answers is null;

update public.players
set practice_results = '[]'::jsonb
where practice_results is null;

alter table public.players
  alter column individual_quiz_answers set default '[]'::jsonb,
  alter column individual_quiz_answers set not null;

alter table public.players
  alter column practice_results set default '[]'::jsonb,
  alter column practice_results set not null;
