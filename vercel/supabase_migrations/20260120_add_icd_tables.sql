-- iCD master/progress tables and settings template keys
create table if not exists public.icd_master (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  bigCategory text,
  bigDesc text,
  middleCategory text,
  smallCategory text,
  evalItem text,
  evalDesc text,
  displayOrder numeric,
  duplicateMiddleKey text,
  duplicateSmallKey text,
  duplicateEvalKey text,
  roles text,
  createdAt text,
  updatedAt text,
  deletedAt text
);

create index if not exists icd_master_tenant_big_idx
  on public.icd_master (tenant_id, bigCategory, displayOrder);

create table if not exists public.icd_progress (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  userId text not null,
  icdId uuid not null,
  proficiency numeric,
  target numeric,
  evaluation numeric,
  comment text,
  createdAt text,
  updatedAt text
);

create unique index if not exists icd_progress_tenant_user_item
  on public.icd_progress (tenant_id, userId, icdId);

-- Settings template for per-tenant department options and role mapping
insert into public.settings_template (key, value)
values
  ('ICD_DEPARTMENT_OPTIONS', '‰c”_•”,‰c‹Æ•”,ƒAƒJƒfƒ~['),
  ('ICD_DEPARTMENT_ROLE_MAP', '{"‰c”_•”":["‰c”_‚P”N–Ú","‰c”_‚Q”N–Ú","‰c”_","”_ê’·"],"‰c‹Æ•”":["‰c‹Æ"],"ƒAƒJƒfƒ~[":["––±","‘–±","ŒÚ–â","ŠÇ—Ò"]}')
on conflict (key) do nothing;
