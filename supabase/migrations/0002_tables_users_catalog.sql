-- =====================================================================
-- 0002_tables_users_catalog.sql
-- المستخدمون + الكتالوج (تصنيفات / وحدات بيع / منتجات)
-- =====================================================================

-- ---------------------------------------------------------------------
-- users
-- ملاحظة مهمة: id هنا = auth.users.id نفسه (Supabase Auth) لضمان
-- التوافق مع auth.uid() في سياسات RLS. يُنشأ هذا السطر عبر Trigger
-- على auth.users عند التسجيل (سيُضاف في ملف الدوال المساعدة).
-- ---------------------------------------------------------------------
create table public.users (
  id            uuid primary key,                -- = auth.users.id
  phone         text not null unique,             -- رقم مصري، يُتحقق منه في التطبيق/قبل الإدخال
  full_name     text not null,
  role          public.user_role not null default 'customer',
  status        public.user_status not null default 'active',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint chk_phone_format check (phone ~ '^01[0125][0-9]{8}$')
);

comment on table public.users is 'الهوية الأساسية لكل مستخدم في النظام بجميع الأدوار الأربعة';

create table public.customer_profiles (
  user_id             uuid primary key references public.users(id) on delete cascade,
  default_address_id  uuid,   -- FK يُضاف لاحقًا بعد إنشاء جدول addresses (لتفادي التبعية الدائرية)
  notes               text,
  created_at          timestamptz not null default now()
);

create table public.agent_profiles (
  user_id                       uuid primary key references public.users(id) on delete cascade,
  availability_status           public.agent_availability not null default 'offline',
  current_active_orders_count   integer not null default 0,
  whatsapp_number               text,   -- رقم المندوب الشخصي المستخدم لإرسال الرسائل اليدوية
  created_at                    timestamptz not null default now(),
  updated_at                    timestamptz not null default now()
);

create table public.addresses (
  id                uuid primary key default gen_random_uuid(),
  customer_id       uuid not null references public.users(id) on delete cascade,
  label             text,
  full_address_text text not null,
  is_default        boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

alter table public.customer_profiles
  add constraint fk_customer_default_address
  foreign key (default_address_id) references public.addresses(id) on delete set null;

-- ---------------------------------------------------------------------
-- الكتالوج
-- ---------------------------------------------------------------------

create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  image_url   text,          -- Cloudinary secure_url
  description text,
  is_active   boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.sale_units (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,   -- قطعة / كيلو / جرام / لتر / عبوة ...
  created_at  timestamptz not null default now()
);

create table public.products (
  id                uuid primary key default gen_random_uuid(),
  category_id       uuid not null references public.categories(id) on delete restrict,
  name              text not null,
  image_url         text,     -- Cloudinary secure_url
  description       text,
  sale_unit_id      uuid not null references public.sale_units(id) on delete restrict,
  last_known_price  numeric(12,2) not null default 0,   -- Cache فقط، المصدر الحقيقي: product_price_history
  status            public.product_status not null default 'active',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table public.product_price_history (
  id                    uuid primary key default gen_random_uuid(),
  product_id            uuid not null references public.products(id) on delete cascade,
  price                 numeric(12,2) not null check (price >= 0),
  source_invoice_item_id uuid,   -- يُربط لاحقًا بعد إنشاء invoice_items (FK يُضاف في ملف لاحق)
  recorded_at           timestamptz not null default now()
);

comment on table public.product_price_history is
  'append-only: كل سعر فعلي مُعتمد يُضاف هنا فقط ولا يُعدَّل أو يُحذف';
