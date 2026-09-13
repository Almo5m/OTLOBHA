-- =====================================================================
-- 0005_tables_ratings_complaints_policies.sql
-- =====================================================================

create table public.ratings (
  id                  uuid primary key default gen_random_uuid(),
  order_id            uuid not null unique references public.orders(id) on delete cascade,
  customer_id         uuid not null references public.users(id),
  agent_id            uuid not null references public.users(id),
  stars               integer not null check (stars between 1 and 5),
  punctuality_score   integer check (punctuality_score between 1 and 5),
  behavior_score      integer check (behavior_score between 1 and 5),
  order_accuracy_score integer check (order_accuracy_score between 1 and 5),
  honesty_score       integer check (honesty_score between 1 and 5),
  created_at          timestamptz not null default now()
);

create table public.complaints (
  id           uuid primary key default gen_random_uuid(),
  customer_id  uuid not null references public.users(id),
  order_id     uuid references public.orders(id),
  agent_id     uuid references public.users(id),
  type         text not null,
  details      text not null,
  status       public.complaint_status not null default 'new',
  created_at   timestamptz not null default now(),
  resolved_at  timestamptz,
  resolved_by  uuid references public.users(id)
);

create table public.policies (
  id           uuid primary key default gen_random_uuid(),
  type         text not null,     -- 'terms' | 'privacy' | ...
  version      text not null,
  content      text not null,
  published_at timestamptz not null default now(),
  unique (type, version)
);

create table public.policy_consents (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.users(id),
  policy_id     uuid not null references public.policies(id),
  order_id      uuid references public.orders(id),
  consented_at  timestamptz not null default now()
);
