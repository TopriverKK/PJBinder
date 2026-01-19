-- Migrate settings to UUID primary key and tenant-scoped uniqueness.
-- Ensure tenant_id exists (skip if already added).
alter table public.settings add column if not exists tenant_id uuid;
alter table public.settings add column if not exists id uuid;

-- Backfill IDs for existing rows.
update public.settings
set id = gen_random_uuid()
where id is null;

-- Default for new rows.
alter table public.settings alter column id set default gen_random_uuid();

-- Swap primary key to id.
alter table public.settings drop constraint if exists settings_pkey;
alter table public.settings add constraint settings_pkey primary key (id);

-- Ensure per-tenant uniqueness by key.
create unique index if not exists settings_tenant_key_unique
  on public.settings (tenant_id, key);
