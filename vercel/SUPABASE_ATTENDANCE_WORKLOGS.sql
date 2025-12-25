-- Attendance work logs (project/task time allocations)
-- Purpose: When the attendance project/task changes (and on clock-in/out/break),
--          record time intervals per (user, project, task).
--
-- This table is intentionally snake_case to avoid quoted identifiers.

create table if not exists public.attendance_worklogs (
  id bigserial primary key,
  created_at timestamptz not null default now(),

  user_id text not null,
  work_date date not null,

  start_at timestamptz not null,
  end_at timestamptz null,

  project_id text null,
  task_id text null,

  source text not null default 'unknown'
);

-- Basic validity: end_at must be after start_at when present
alter table public.attendance_worklogs
  drop constraint if exists attendance_worklogs_time_order;
alter table public.attendance_worklogs
  add constraint attendance_worklogs_time_order
  check (end_at is null or end_at >= start_at);

create index if not exists attendance_worklogs_user_date_start
  on public.attendance_worklogs (user_id, work_date, start_at);

create index if not exists attendance_worklogs_open_segments
  on public.attendance_worklogs (user_id, work_date)
  where end_at is null;
