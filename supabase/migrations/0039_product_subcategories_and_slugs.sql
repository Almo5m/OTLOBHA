-- =====================================================================
-- 0039_product_subcategories_and_slugs.sql
-- (1) تصنيف فرعي داخل كل قسم (مثلاً داخل "السوق": معلبات، مجمدات...)
--     عشان العميل يقدر يرتّب/يفلتر المنتجات جوه القسم بدل ما تكون كلها
--     في قائمة واحدة مسطّحة.
-- (2) slug لكل منتج — رابط ثابت وواضح بدل الاعتماد على الـID بس، بيحسّن
--     نتائج الظهور في البحث.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) التصنيفات الفرعية
-- ---------------------------------------------------------------------
create table public.product_subcategories (
  id            uuid primary key default gen_random_uuid(),
  category_id   uuid not null references public.categories(id) on delete cascade,
  name          text not null,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now(),
  unique (category_id, name)
);

alter table public.product_subcategories enable row level security;

create policy product_subcategories_read_all on public.product_subcategories
  for select using (true);
create policy product_subcategories_write_super_admin on public.product_subcategories
  for insert with check (public.is_super_admin());
create policy product_subcategories_update_super_admin on public.product_subcategories
  for update using (public.is_super_admin());
create policy product_subcategories_delete_super_admin on public.product_subcategories
  for delete using (public.is_super_admin());

create trigger trg_product_subcategories_updated_at
  before update on public.product_subcategories
  for each row execute function public.set_updated_at();

alter table public.products
  add column subcategory_id uuid references public.product_subcategories(id) on delete set null;

create index idx_products_subcategory on public.products(subcategory_id);

-- ---------------------------------------------------------------------
-- 2) الـslug
-- ---------------------------------------------------------------------
create or replace function public.fn_slugify(p_text text)
returns text
language sql immutable
as $$
  -- بيحافظ على الحروف العربية والإنجليزية والأرقام، ويستبدل أي حاجة تانية
  -- (مسافات، علامات ترقيم) بشرطة، من غير ما يكسر لو الاسم فاضي
  select nullif(
    trim(both '-' from regexp_replace(regexp_replace(trim(p_text), '\s+', '-', 'g'), '[^ء-ي‌آ-ۿ0-9A-Za-z\-]', '', 'g')),
    ''
  )
$$;

alter table public.products add column slug text;

-- تعبئة فورية لكل المنتجات الحالية: اسم + آخر 6 حروف من الـID لضمان التفرد
update public.products
set slug = coalesce(public.fn_slugify(name), 'منتج') || '-' || substr(id::text, 1, 6)
where slug is null;

alter table public.products alter column slug set not null;
alter table public.products add constraint products_slug_unique unique (slug);

create or replace function public.fn_set_product_slug()
returns trigger
language plpgsql
as $$
begin
  if new.slug is null or length(trim(new.slug)) = 0 then
    new.slug := coalesce(public.fn_slugify(new.name), 'منتج') || '-' || substr(new.id::text, 1, 6);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_set_product_slug on public.products;
create trigger trg_set_product_slug
  before insert on public.products
  for each row execute function public.fn_set_product_slug();
