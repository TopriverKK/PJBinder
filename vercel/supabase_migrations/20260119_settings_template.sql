-- Create settings_template to store per-tenant default keys.
create table if not exists public.settings_template (
  key text primary key,
  value text,
  updatedAt text
);

insert into public.settings_template (key, value, updatedAt) values
  ('DAILY_TEMPLATE_ID','', now()::text),
  ('MINUTES_TEMPLATE_ID','', now()::text),
  ('NOTES_FOLDER_ID','', now()::text),
  ('PROJECT_TEMPLATE_ID','', now()::text),
  ('TASK_TEMPLATE_ID','', now()::text),
  ('LOGO_URL','', now()::text)
on conflict (key) do update
  set value = excluded.value,
      updatedAt = excluded.updatedAt;
