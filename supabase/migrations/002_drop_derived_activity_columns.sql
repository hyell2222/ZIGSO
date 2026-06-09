-- =====================================================================
-- Jigsaw — drop derived/duplicate activity columns
--
-- `group_size` (= activity_pack.roles.length) and `task_count`
-- (= number of test questions in activity_pack) are always derivable
-- from the activity_pack JSON, so the denormalized columns are removed.
-- Idempotent: safe to re-run.
-- =====================================================================

alter table public.activities drop column if exists group_size;
alter table public.activities drop column if exists task_count;
