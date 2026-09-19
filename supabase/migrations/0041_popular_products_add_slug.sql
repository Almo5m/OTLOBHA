-- =====================================================================
-- 0041_popular_products_add_slug.sql
-- إضافة slug لنتائج المنتجات الأكثر طلبًا عشان تقدر تتربط بصفحة المنتج
-- =====================================================================

create or replace function public.get_popular_products(p_limit integer default 8)
returns table (
  product_id uuid,
  name text,
  image_url text,
  last_known_price numeric,
  unit_id uuid,
  unit_name text,
  slug text,
  times_ordered bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    p.name,
    p.image_url,
    p.last_known_price,
    p.sale_unit_id,
    su.name,
    p.slug,
    count(oi.id) as times_ordered
  from public.order_items oi
  join public.orders o on o.id = oi.order_id
  join public.products p on p.id = oi.product_id
  join public.sale_units su on su.id = p.sale_unit_id
  where o.status = 'delivered' and p.status = 'active'
  group by p.id, p.name, p.image_url, p.last_known_price, p.sale_unit_id, su.name, p.slug
  order by times_ordered desc
  limit p_limit;
$$;

grant execute on function public.get_popular_products(integer) to authenticated;
