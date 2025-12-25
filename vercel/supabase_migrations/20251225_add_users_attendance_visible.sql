-- Add per-user attendance settings columns.
-- Run this in Supabase SQL Editor.

alter table public.users
  add column if not exists "attendanceVisible" boolean default true;

-- Optional (already referenced by the UI/README)
alter table public.users
  add column if not exists "employeeNumber" text;

alter table public.users
  add column if not exists "calendarUrl" text;
