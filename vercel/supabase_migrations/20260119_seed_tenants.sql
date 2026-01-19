-- Seed tenants (update existing + add new).
-- NOTE: Replace ".example.com" with your actual base domain.
alter table public.tenants add column if not exists name text;
alter table public.tenants add column if not exists host text;

with seed as (
  select
    '683efb44-d104-4a31-b78d-c8d22f5e6dc1'::uuid as id,
    'トップリバーアカデミー'::text as name
),
upsert_one as (
  insert into public.tenants (id, name, host)
  select
    id,
    name,
    concat('tenant-', substr(replace(id::text, '-', ''), 1, 8), '.example.com') as host
  from seed
  on conflict (id) do update
    set name = excluded.name,
        host = excluded.host
  returning id, name, host
),
new_tenant as (
  select gen_random_uuid() as id, 'トップリバー'::text as name
)
insert into public.tenants (id, name, host)
select
  id,
  name,
  concat('tenant-', substr(replace(id::text, '-', ''), 1, 8), '.example.com') as host
from new_tenant
returning id, name, host;
