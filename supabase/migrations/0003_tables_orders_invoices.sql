-- =====================================================================
-- 0003_tables_orders_invoices.sql
-- الطلبات + الفواتير — جوهر النظام
-- =====================================================================

create sequence public.order_number_seq start 1000;

create table public.orders (
  id                          uuid primary key default gen_random_uuid(),
  order_number                text not null unique
                                default ('ORD-' || nextval('public.order_number_seq')::text),
  customer_id                 uuid not null references public.users(id) on delete restrict,
  status                      public.order_status not null default 'new_order',

  -- Snapshots تُجمَّد وقت الإنشاء/القبول ولا تتغير بتغيّر الإعدادات لاحقًا
  delivery_address_snapshot   jsonb not null,
  delivery_fee_applied        numeric(12,2) not null default 0,
  previous_debt_applied       numeric(12,2) not null default 0,

  payment_method              public.payment_method not null,
  payment_status              public.payment_status not null default 'unpaid',

  assigned_agent_id           uuid references public.users(id) on delete set null,

  policy_version_accepted     text,
  policy_accepted_at          timestamptz,

  rejection_reason            text,
  rejected_by                 uuid references public.users(id),
  rejected_at                 timestamptz,

  cancellation_reason         text,
  canceled_by                 uuid references public.users(id),
  canceled_at                 timestamptz,

  accepted_at                 timestamptz,
  delivered_at                timestamptz,

  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

comment on column public.orders.delivery_address_snapshot is
  'نسخة كاملة (JSON) من عنوان التسليم وقت إنشاء الطلب — لا يتأثر بتعديل عنوان العميل لاحقًا';

create table public.order_items (
  id                        uuid primary key default gen_random_uuid(),
  order_id                  uuid not null references public.orders(id) on delete cascade,
  product_id                uuid references public.products(id) on delete restrict,  -- null إذا يدوي
  item_type                 public.order_item_type not null,
  manual_name               text,    -- إلزامي فقط إذا item_type = manual
  quantity                  numeric(10,3) not null check (quantity > 0),
  unit_id                   uuid not null references public.sale_units(id),
  customer_comment          text,

  displayed_price_snapshot  numeric(12,2),   -- السعر الظاهر وقت الإضافة (لأغراض العرض فقط، غير نهائي)
  actual_price              numeric(12,2),   -- يُملأ أثناء الشراء
  is_available               boolean,         -- null = لم يُحسم بعد
  unavailable_reason         text,

  created_at                timestamptz not null default now(),

  constraint chk_manual_name check (
    (item_type = 'manual' and manual_name is not null)
    or (item_type = 'catalog' and product_id is not null)
  )
);

create table public.order_transfers (
  id             uuid primary key default gen_random_uuid(),
  order_id       uuid not null references public.orders(id) on delete cascade,
  from_agent_id  uuid not null references public.users(id),
  to_agent_id    uuid references public.users(id),   -- قد يكون null لحظة إعادة الطلب لحوض الانتظار
  reason         text not null,
  transferred_at timestamptz not null default now()
);

comment on table public.order_transfers is
  'مرئي فقط لـ Super Admin عبر Audit Log — لا يظهر للمندوب الجديد ولا للعميل';

create table public.order_status_history (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references public.orders(id) on delete cascade,
  from_status  public.order_status,
  to_status    public.order_status not null,
  changed_by   uuid references public.users(id),
  reason       text,
  changed_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- الفواتير
-- ---------------------------------------------------------------------

create sequence public.invoice_number_seq start 1000;

create table public.invoices (
  id                        uuid primary key default gen_random_uuid(),
  invoice_number            text not null unique
                              default ('INV-' || nextval('public.invoice_number_seq')::text),
  order_id                  uuid not null references public.orders(id) on delete restrict,
  status                    public.invoice_status not null default 'draft',

  items_total               numeric(12,2) not null default 0,
  delivery_fee              numeric(12,2) not null default 0,
  previous_debt_included    numeric(12,2) not null default 0,
  grand_total               numeric(12,2) not null default 0,

  payment_method            public.payment_method not null,
  payment_status            public.payment_status not null default 'unpaid',

  approved_by               uuid references public.users(id),
  approved_at               timestamptz,

  canceled_reason           text,
  canceled_by               uuid references public.users(id),
  canceled_at               timestamptz,
  superseded_by_invoice_id  uuid references public.invoices(id),

  created_at                timestamptz not null default now()
);

create table public.invoice_items (
  id             uuid primary key default gen_random_uuid(),
  invoice_id     uuid not null references public.invoices(id) on delete cascade,
  product_name   text not null,     -- نسخة نصية مجمّدة، ليست FK حية
  quantity       numeric(10,3) not null,
  unit_name      text not null,     -- نسخة نصية مجمّدة
  actual_price   numeric(12,2),
  line_total     numeric(12,2) not null default 0,
  is_available   boolean not null default true,
  created_at     timestamptz not null default now()
);

comment on table public.invoice_items is
  'Snapshot مجمّد تمامًا بعد اعتماد الفاتورة — منفصل عن order_items القابل للتحديث أثناء التنفيذ';

-- ربط product_price_history بمصدرها الآن بعد إنشاء invoice_items
alter table public.product_price_history
  add constraint fk_price_history_invoice_item
  foreign key (source_invoice_item_id) references public.invoice_items(id) on delete set null;
