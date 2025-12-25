-- Weekly reports (v2)
-- Key: (weekStart YYYY-MM-DD) x (userId) x (projectId)
-- This migrates the existing `weeklyreports` table created by SUPABASE_WEEKLYREPORTS.sql.
--
-- Notes:
-- - `projectId` uses '' as a "general" bucket (no project).
-- - Existing rows are migrated to projectId=''.

-- IMPORTANT
-- If your v1 table was created with *unquoted* identifiers (weekStart/userId/etc),
-- Postgres will have folded them to lower-case (weekstart/userid/updatedat...).
-- This migration first renames those legacy columns to the quoted camelCase names
-- that the app/RPC expects.

do $$
begin
  if to_regclass('public.weeklyreports') is null then
    raise exception 'weeklyreports table does not exist. Run SUPABASE_WEEKLYREPORTS.sql first.';
  end if;
end $$;

do $$
begin
  -- weekStart
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='weeklyreports' and column_name='weekstart'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='weeklyreports' and column_name='weekStart'
  ) then
    execute 'alter table public.weeklyreports rename column weekstart to "weekStart"';
  end if;

  -- userId
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='weeklyreports' and column_name='userid'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='weeklyreports' and column_name='userId'
  ) then
    execute 'alter table public.weeklyreports rename column userid to "userId"';
  end if;

  -- createdAt
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='weeklyreports' and column_name='createdat'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='weeklyreports' and column_name='createdAt'
  ) then
    execute 'alter table public.weeklyreports rename column createdat to "createdAt"';
  end if;

  -- updatedAt
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='weeklyreports' and column_name='updatedat'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='weeklyreports' and column_name='updatedAt'
  ) then
    execute 'alter table public.weeklyreports rename column updatedat to "updatedAt"';
  end if;

  -- Optional: projectId legacy names
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='weeklyreports' and column_name='projectid'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='weeklyreports' and column_name='projectId'
  ) then
    execute 'alter table public.weeklyreports rename column projectid to "projectId"';
  end if;
end $$;

-- 1) Ensure column exists
alter table if exists public.weeklyreports
  add column if not exists "projectId" text not null default '';

-- 2) Backfill for safety (in case column was created nullable before)
update public.weeklyreports set "projectId" = '' where "projectId" is null;

-- (Optional but recommended) Keep "updatedAt" correct on update
drop trigger if exists set_updatedat on public.weeklyreports;
create trigger set_updatedat
before update on public.weeklyreports
for each row
execute function public.set_updatedat();

-- 3) Update PK to include projectId
do $$
declare
  pk_name text;
begin
  select conname into pk_name
  from pg_constraint
  where conrelid = 'public.weeklyreports'::regclass
    and contype = 'p'
  limit 1;

  if pk_name is not null then
    execute format('alter table public.weeklyreports drop constraint %I', pk_name);
  end if;
end $$;

alter table public.weeklyreports
  add constraint weeklyreports_pkey primary key ("weekStart", "userId", "projectId");

-- 4) Helpful index for listing by week
create index if not exists weeklyreports_weekstart_idx on public.weeklyreports ("weekStart");
