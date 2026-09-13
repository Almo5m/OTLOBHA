-- =====================================================================
-- 0004_tables_financial.sql
-- الديون + العمولة + الإعدادات العامة
-- =====================================================================

create table public.platform_settings (
  key         text primary key,     -- 'delivery_fee' | 'commission_rate' | 'cancellation_debt_value' | ...
  value       jsonb not null,
  updated_by  uuid references public.users(id),
  updated_at  timestamptz not null default now()
);

comment on table public.platform_settings is
  'كل الإعدادات القابلة للتغيير من لوحة التحكم. القيم الافتراضية المتفق عليها تُدرج في seed منفصل (0 لكل من الرسوم/العمولة/مديونية الإلغاء)';

create table public.debts (
  id                     uuid primary key default gen_random_uuid(),
  customer_id            uuid not null references public.users(id) on delete restrict,
  order_id               uuid references public.orders(id) on delete set null,
  amount                 numeric(12,2) not null check (amount >= 0),
  reason                 public.debt_reason not null,
  applied_rate_snapshot  jsonb,     -- نسخة من الإعداد المُطبَّق وقت الإنشاء (قيمة أو نسبة)
  status                 public.debt_status not null default 'outstanding',
  created_at             timestamptz not null default now()
);

create table public.debt_settlements (
  id            uuid primary key default gen_random_uuid(),
  debt_id       uuid not null references public.debts(id) on delete cascade,
  amount_paid   numeric(12,2) not null check (amount_paid > 0),
  settled_by    uuid references public.users(id),
  settled_at    timestamptz not null default now(),
  notes         text
);

create table public.commission_ledger (
  id                       uuid primary key default gen_random_uuid(),
  order_id                 uuid not null unique references public.orders(id) on delete restrict,
  completed_at             timestamptz not null,
  delivery_fee_at_time     numeric(12,2) not null,
  commission_rate_applied  numeric(6,4) not null,   -- نسخة مُجمَّدة وقت الاحتساب
  commission_amount        numeric(12,2) not null,
  status                   public.commission_status not null default 'due',
  created_at               timestamptz not null default now()
);

create table public.commission_payments (
  id           uuid primary key default gen_random_uuid(),
  amount       numeric(12,2) not null check (amount > 0),
  period_from  date,
  period_to    date,
  paid_at      timestamptz not null default now(),
  recorded_by  uuid references public.users(id),
  notes        text    -- مثال: "تم الاستلام عن طريق تحويل بنكي"
);

comment on table public.commission_payments is
  'تسجيل يدوي فقط: تم استلام العمولة عبر تحويل — بدون أي تكامل بنكي تقني';
