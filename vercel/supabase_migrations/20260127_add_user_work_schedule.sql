-- Add user work schedule and multiple breaks settings
alter table public.users
  add column if not exists "workScheduleType" text,
  add column if not exists "workStartTime" text,
  add column if not exists "workEndTime" text,
  add column if not exists "coreStartTime" text,
  add column if not exists "coreEndTime" text,
  add column if not exists "workBreaks" jsonb;

update public.users
set
  "workScheduleType" = coalesce("workScheduleType", 'fixed'),
  "workBreaks" = coalesce("workBreaks", '[]'::jsonb)
where "workScheduleType" is null
   or "workBreaks" is null;
