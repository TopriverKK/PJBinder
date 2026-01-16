-- Subscriptions, facility reservations, and payment requests
-- Note: camelCase columns are quoted to match existing JSON keys.

create table if not exists public.subscriptions (
  id text primary key,
  "serviceName" text,
  "vendor" text,
  "startDate" text,
  "amount" numeric,
  "taxIncluded" boolean,
  "amountInclTax" numeric,
  "amountExclTax" numeric,
  "projectId" text,
  "taxCode" text,
  "account" text,
  "cycle" text,
  "nextBillDate" text,
  "autoJournal" boolean,
  "memo" text,
  "createdAt" text,
  "updatedAt" text
);

create index if not exists subscriptions_project_idx on public.subscriptions ("projectId");
create index if not exists subscriptions_next_bill_idx on public.subscriptions ("nextBillDate");

alter table public.subscriptions add column if not exists "amountInclTax" numeric;
alter table public.subscriptions add column if not exists "amountExclTax" numeric;

create table if not exists public.facility_reservations (
  id text primary key,
  "facilityId" text,
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

alter table public.facility_reservations add column if not exists "facilityId" text;
create index if not exists facility_reservations_facility_idx on public.facility_reservations ("facilityId");

create table if not exists public.facility_assets (
  id text primary key,
  "name" text not null,
  "color" text,
  "active" boolean default true,
  "sortOrder" numeric,
  "createdAt" text,
  "updatedAt" text
);

create index if not exists facility_assets_active_idx on public.facility_assets ("active");
create index if not exists facility_assets_name_idx on public.facility_assets ("name");

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

create table if not exists public.workflow_requests (
  id text primary key,
  "title" text not null,
  "requesterId" text not null,
  "amount" numeric,
  "dueDate" date,
  "vendor" text,
  "account" text,
  "projectId" text,
  "status" text default 'draft',
  "memoText" text,
  "approverIds" text,
  "currentStep" numeric,
  "requestDate" date,
  "createdAt" text,
  "updatedAt" text
);

create index if not exists workflow_requests_requester_idx on public.workflow_requests ("requesterId");
create index if not exists workflow_requests_project_idx on public.workflow_requests ("projectId");
create index if not exists workflow_requests_due_idx on public.workflow_requests ("dueDate");
create index if not exists workflow_requests_status_idx on public.workflow_requests ("status");

create table if not exists public.workflow_approvals (
  id text primary key,
  "workflowId" text not null,
  "step" numeric,
  "approverId" text,
  "action" text,
  "comment" text,
  "actedAt" text,
  "createdAt" text,
  "updatedAt" text
);

create index if not exists workflow_approvals_workflow_idx on public.workflow_approvals ("workflowId");
create index if not exists workflow_approvals_approver_idx on public.workflow_approvals ("approverId");
