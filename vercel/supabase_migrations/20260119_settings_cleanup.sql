-- Remove legacy/overlapping settings keys (prefer GOOGLE_* keys).
delete from public.settings
where key in ('LOGO_URL', 'NOTES_FOLDER_ID');

delete from public.settings_template
where key in ('LOGO_URL', 'NOTES_FOLDER_ID');
