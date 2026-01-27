-- Add fields for cost/effort management
alter table public.users
  add column if not exists "hourlyRate" numeric;

alter table public.projects
  add column if not exists "budgetAmount" numeric,
  add column if not exists "estimatedHours" numeric;

alter table public.tasks
  add column if not exists "plannedHours" numeric;

update public.users
set "hourlyRate" = coalesce("hourlyRate", 2000);

update public.projects
set "budgetAmount" = coalesce("budgetAmount", null),
    "estimatedHours" = coalesce("estimatedHours", null);

update public.tasks
set "plannedHours" = coalesce("plannedHours", null);
