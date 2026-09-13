-- =====================================================================
-- 0023_popular_products_for_customers.sql
-- قسم "المنتجات الأكثر طلبًا" في الصفحة الرئيسية للعميل — يعرض المنتجات
-- الأكثر طلبًا عبر كل العملاء (وليس بيانات شخصية) عشان يفكّر العميل
-- بحاجة كان ناوي يطلبها ونساها.
-- =====================================================================

create or replace function public.get_popular_products(p_limit integer default 8)
returns table (
  product_id uuid,
  name text,
  image_url text,
  last_known_price numeric,
  unit_id uuid,
  unit_name text,
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
    count(oi.id) as times_ordered
  from public.order_items oi
  join public.orders o on o.id = oi.order_id
  join public.products p on p.id = oi.product_id
  join public.sale_units su on su.id = p.sale_unit_id
  where o.status = 'delivered' and p.status = 'active'
  group by p.id, p.name, p.image_url, p.last_known_price, p.sale_unit_id, su.name
  order by times_ordered desc
  limit p_limit;
$$;

-- بيانات مجمّعة (Aggregate) عن منتجات نشطة فقط — لا تكشف أي بيانات شخصية،
-- لذلك يمكن إتاحتها لأي مستخدم مسجّل دخول (وليس الإداريين فقط)
grant execute on function public.get_popular_products(integer) to authenticated;
