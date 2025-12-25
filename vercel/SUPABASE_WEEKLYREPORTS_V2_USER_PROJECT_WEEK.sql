-- Weekly reports (v2)
-- Key: (weekStart YYYY-MM-DD) x (userId) x (projectId)
-- This migrates the existing `weeklyreports` table created by SUPABASE_WEEKLYREPORTS.sql.
--
-- Notes:
-- - `projectId` uses '' as a "general" bucket (no project).
-- - Existing rows are migrated to projectId=''.

-- 1) Ensure column exists
alter table if exists weeklyreports
  add column if not exists "projectId" text not null default '';

-- 2) Backfill for safety (in case column was created nullable before)
update weeklyreports set "projectId" = '' where "projectId" is null;

-- 3) Update PK to include projectId
alter table if exists weeklyreports
  drop constraint if exists weeklyreports_pkey;

alter table if exists weeklyreports
  add constraint weeklyreports_pkey primary key ("weekStart", "userId", "projectId");

-- 4) Helpful index for listing by week
create index if not exists weeklyreports_weekstart_idx on weeklyreports ("weekStart");
