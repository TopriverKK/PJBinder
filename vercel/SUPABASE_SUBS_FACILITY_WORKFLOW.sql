-- Subscriptions, facility reservations, and payment requests
-- Note: camelCase columns are quoted to match existing JSON keys.

create table if not exists public.subscriptions (
  id text primary key,
  "serviceName" text,
  "vendor" text,
  "startDate" text,
  "amount" numeric,
  "taxIncluded" boolean,
  "projectId" text,
  "taxCode" text,
  "account" text,
  "cycle" text,
  "nextBillDate" text,
  "autoJournal" boolean,
  "memoText" text,
  "createdAt" text,
  "updatedAt" text
);

create index if not exists subscriptions_project_idx on public.subscriptions ("projectId");
create index if not exists subscriptions_next_bill_idx on public.subscriptions ("nextBillDate");

create table if not exists public.facility_reservations (
  id text primary key,
  "facilityName" text not null,
  "title" text,
  "userId" text,
  "status" text default 'pending',
  "startDate" date not null,
  "endDate" date,
  "startTime" text,
  "endTime" text,
  "location" text,
  "projectId" text,
  "memoText" text,
  "createdAt" text,
  "updatedAt" text
);

create index if not exists facility_reservations_user_idx on public.facility_reservations ("userId");
create index if not exists facility_reservations_project_idx on public.facility_reservations ("projectId");
create index if not exists facility_reservations_start_idx on public.facility_reservations ("startDate");

create table if not exists public.payment_requests (
  id text primary key,
  "title" text not null,
  "userId" text not null,
  "amount" numeric,
  "dueDate" date,
  "vendor" text,
  "account" text,
  "projectId" text,
  "status" text default 'draft',
  "memoText" text,
  "requestDate" date,
  "createdAt" text,
  "updatedAt" text
);

create index if not exists payment_requests_user_idx on public.payment_requests ("userId");
create index if not exists payment_requests_project_idx on public.payment_requests ("projectId");
create index if not exists payment_requests_due_idx on public.payment_requests ("dueDate");
