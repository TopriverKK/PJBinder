-- Add Google service account settings keys to settings_template.
insert into public.settings_template (key, value, updatedAt) values
  ('GOOGLE_CLIENT_EMAIL','', now()::text),
  ('GOOGLE_PRIVATE_KEY','', now()::text),
  ('GOOGLE_DRIVE_ID','', now()::text),
  ('GOOGLE_BASE_FOLDER_ID','', now()::text),
  ('GOOGLE_PROJECT_DOCS_FOLDER_ID','', now()::text),
  ('GOOGLE_MINUTES_FOLDER_ID','', now()::text),
  ('GOOGLE_DAILY_REPORTS_FOLDER_ID','', now()::text),
  ('GOOGLE_LOGO_FILE_ID','', now()::text)
on conflict (key) do update
  set value = excluded.value,
      updatedAt = excluded.updatedAt;
