-- =====================================================================
-- Migration 003 — Multiple practice/test questions per role
-- Replace practice_wrong_attempts with practice_results JSON array.
-- =====================================================================

alter table public.players add column if not exists practice_results jsonb not null default '[]'::jsonb;
alter table public.players drop column if exists practice_wrong_attempts;
