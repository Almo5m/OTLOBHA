-- =====================================================================
-- 0027_discounts_and_promotions.sql
-- خصومات التوصيل (عامة/لعميل واحد) + محرك عروض مشروطة قابل للتوسع
-- =====================================================================

-- ---------------------------------------------------------------------
-- خصومات التوصيل — ثابتة، تُطبَّق على كل طلب للعميل المستهدف (أو الكل)
-- طالما فعّالة، بدون شرط عدد طلبات أو نافذة زمنية (ده دور الـPromotions
-- تحت). خصم واحد نشط لكل عميل في نفس الوقت لتفادي التعقيد.
-- ---------------------------------------------------------------------
create table public.customer_discounts (
  id             uuid primary key default gen_random_uuid(),
  customer_id    uuid references public.users(id) on delete cascade,  -- null = خصم عام لكل العملاء
  discount_type  text not null check (discount_type in ('percentage', 'fixed')),
  value          numeric(12,2) not null check (value > 0),
  is_active      boolean not null default true,
  created_by     uuid references public.users(id),
  created_at     timestamptz not null default now(),
  expires_at     timestamptz
);

comment on table public.customer_discounts is
  'خصم على رسوم التوصيل — عام (customer_id=null) أو لعميل محدد. يُطبَّق تلقائيًا في create_order';

alter table public.customer_discounts enable row level security;

create policy discounts_select_admin on public.customer_discounts
  for select using (public.is_admin());
create policy discounts_write_admin on public.customer_discounts
  for all using (public.is_admin()) with check (public.is_admin());

create index idx_discounts_customer on public.customer_discounts (customer_id) where is_active = true;

-- ---------------------------------------------------------------------
-- محرك العروض المشروطة — Condition/Reward قابل للتوسع مستقبلًا بإضافة
-- condition_type جديد بدون تعديل الجدول (Config كـ jsonb)
-- النوع المبني حاليًا: order_count_window
--   config: {"count": 5, "window_hours": 24}
--   → لو عدد طلبات العميل (غير الملغاة) خلال آخر window_hours + الطلب
--     الحالي وصل لـ count بالظبط، يُطبَّق الجائزة على رسوم التوصيل لهذا
--     الطلب فقط (وليس على قيمة المنتجات — القرار موضّح في تقرير التصميم)
-- ---------------------------------------------------------------------
create table public.promotions (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  description      text,
  condition_type   text not null default 'order_count_window',
  condition_config jsonb not null,
  reward_type      text not null check (reward_type in ('free_delivery', 'delivery_discount_percent', 'delivery_discount_fixed')),
  reward_value     numeric(12,2),   -- مطلوب فقط لو reward_type نسبة/قيمة، مش لازم لـ free_delivery
  is_active        boolean not null default true,
  created_by       uuid references public.users(id),
  created_at       timestamptz not null default now()
);

alter table public.promotions enable row level security;
create policy promotions_select_admin on public.promotions for select using (public.is_admin());
create policy promotions_write_admin on public.promotions for all using (public.is_admin()) with check (public.is_admin());

-- استهداف عملاء محددين — لو مفيش صفوف هنا، العرض يبقى عام لكل العملاء
create table public.promotion_customers (
  promotion_id uuid not null references public.promotions(id) on delete cascade,
  customer_id  uuid not null references public.users(id) on delete cascade,
  primary key (promotion_id, customer_id)
);

alter table public.promotion_customers enable row level security;
create policy promotion_customers_admin on public.promotion_customers for all using (public.is_admin()) with check (public.is_admin());

-- سجل الاستفادة — يمنع تكرار نفس العرض للعميل في نفس النافذة الزمنية،
-- ويوثّق تاريخيًا أي طلب استفاد بأي عرض ومتى
create table public.promotion_redemptions (
  id            uuid primary key default gen_random_uuid(),
  promotion_id  uuid not null references public.promotions(id),
  customer_id   uuid not null references public.users(id),
  order_id      uuid not null references public.orders(id),
  redeemed_at   timestamptz not null default now()
);

alter table public.promotion_redemptions enable row level security;
create policy promotion_redemptions_select_admin on public.promotion_redemptions for select using (public.is_admin());
create policy promotion_redemptions_select_customer on public.promotion_redemptions
  for select using (customer_id = auth.uid());

-- ---------------------------------------------------------------------
-- Snapshot على الطلب: نحتفظ بالرسوم الأصلية قبل أي خصم/عرض، ونوثّق
-- مصدر التخفيض (خصم ثابت أو عرض) — بدون كسر أي بيانات تاريخية قديمة
-- ---------------------------------------------------------------------
alter table public.orders add column if not exists delivery_fee_original numeric(12,2);
alter table public.orders add column if not exists applied_discount_id uuid references public.customer_discounts(id);
alter table public.orders add column if not exists applied_promotion_id uuid references public.promotions(id);

update public.orders set delivery_fee_original = delivery_fee_applied where delivery_fee_original is null;
