alter table public.users
  add column if not exists "userPassword" text;
