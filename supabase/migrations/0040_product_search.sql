-- =====================================================================
-- 0040_product_search.sql
-- بحث حقيقي على المنتجات (اسم + وصف) باستخدام pg_trgm — بيدعم التطابق
-- الجزئي والتشابه (لو العميل غلط في حرف أو كتب جزء من الاسم بس)، وده
-- بيناسب العربي أكتر من full-text search العادي.
-- =====================================================================

create extension if not exists "pg_trgm";

create index if not exists idx_products_name_trgm on public.products using gin (name gin_trgm_ops);
create index if not exists idx_products_description_trgm on public.products using gin (description gin_trgm_ops);

create or replace function public.search_products(p_query text, p_limit integer default 30)
returns table (
  id uuid,
  name text,
  image_url text,
  description text,
  last_known_price numeric,
  category_id uuid,
  category_name text,
  sale_unit_id uuid,
  unit_name text,
  slug text,
  rank real
)
language sql stable
as $$
  select
    p.id, p.name, p.image_url, p.description, p.last_known_price,
    p.category_id, c.name as category_name, p.sale_unit_id, su.name as unit_name, p.slug,
    greatest(similarity(p.name, p_query), similarity(coalesce(p.description, ''), p_query) * 0.5) as rank
  from public.products p
  join public.categories c on c.id = p.category_id
  join public.sale_units su on su.id = p.sale_unit_id
  where p.status = 'active'
    and (
      p.name ilike '%' || p_query || '%'
      or p.description ilike '%' || p_query || '%'
      or similarity(p.name, p_query) > 0.15
    )
  order by rank desc, p.name
  limit p_limit;
$$;

grant execute on function public.search_products(text, integer) to authenticated, anon;
