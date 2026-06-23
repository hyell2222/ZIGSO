-- =====================================================================
-- Zigso — drop obsolete description column from activities table
--
-- The description column has been removed from the activities table
-- since it is no longer used or rendered in the application.
-- =====================================================================

ALTER TABLE public.activities DROP COLUMN IF EXISTS description;
