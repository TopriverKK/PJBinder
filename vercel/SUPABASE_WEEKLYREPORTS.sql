-- Weekly progress
-- One row per (weekStart YYYY-MM-DD) x (userId)

create table if not exists public.weeklyreports (
  "weekStart" date not null,
  "userId" text not null,
  "issues" text not null default '',
  "done"   text not null default '',
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  primary key ("weekStart", "userId")
);

-- Keep "updatedAt" fresh on updates.
-- NOTE: Supabase default projects often already include public.set_updatedat().
drop trigger if exists set_updatedat on public.weeklyreports;
create trigger set_updatedat
before update on public.weeklyreports
for each row
execute function public.set_updatedat();
