-- =====================================================================
-- 0006_tables_audit_sessions_notifications.sql
-- =====================================================================

create table public.audit_log (
  id           uuid primary key default gen_random_uuid(),
  actor_id     uuid references public.users(id),
  actor_role   public.user_role,
  action       text not null,          -- 'order.accept' | 'invoice.approve' | ...
  entity_type  text not null,          -- 'orders' | 'invoices' | 'debts' | ...
  entity_id    uuid,
  old_value    jsonb,
  new_value    jsonb,
  reason       text,
  created_at   timestamptz not null default now()
);

comment on table public.audit_log is
  'Append-only بشكل صارم — لا توجد أي سياسة UPDATE أو DELETE على هذا الجدول لأي دور';

create table public.user_sessions (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.users(id) on delete cascade,
  device_info    text,
  ip_address     text,
  created_at     timestamptz not null default now(),
  last_active_at timestamptz not null default now(),
  revoked_at     timestamptz,
  revoked_by     uuid references public.users(id)
);

create table public.password_reset_tokens (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  token_hash  text not null unique,     -- يُخزَّن hash فقط للرمز، ليس الرمز نفسه
  expires_at  timestamptz not null,
  used_at     timestamptz,
  created_by  uuid references public.users(id),   -- الموظف الذي تحقق من الهوية وأصدر الرابط
  created_at  timestamptz not null default now()
);

comment on table public.password_reset_tokens is
  'رابط استعادة كلمة المرور يُرسل يدويًا عبر واتساب المندوب/الإداري (Click-to-Chat) — صفر تكلفة';

create table public.whatsapp_templates (
  id          uuid primary key default gen_random_uuid(),
  event_key   text not null unique,   -- 'order_accepted' | 'invoice_ready' | 'on_the_way' | 'delivered' | ...
  body_text   text not null,          -- يدعم متغيرات مثل {{customer_name}} {{order_number}} {{grand_total}}
  is_active   boolean not null default true,
  updated_by  uuid references public.users(id),
  updated_at  timestamptz not null default now()
);

create table public.notification_log (
  id           uuid primary key default gen_random_uuid(),
  event_key    text not null,
  channel      public.notification_channel not null,
  recipient_id uuid references public.users(id),
  status       public.notification_status not null,
  payload      jsonb,           -- النص المُولَّد فعليًا وقت الحدث
  created_at   timestamptz not null default now()
);

create table public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  endpoint    text not null unique,
  keys        jsonb not null,   -- p256dh / auth (VAPID)
  created_at  timestamptz not null default now()
);
