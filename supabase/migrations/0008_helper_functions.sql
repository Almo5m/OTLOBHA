-- =====================================================================
-- 0008_helper_functions.sql
-- دوال مساعدة لاستخدامها داخل سياسات RLS، وربط Supabase Auth بجدول users
-- =====================================================================

-- ---------------------------------------------------------------------
-- current_role(): تُستخدم داخل كل سياسات RLS بدل الاستعلام المباشر
-- عن جدول users، لتفادي مشاكل الاستدعاء الدائري (Recursive RLS).
-- SECURITY DEFINER تعني أن الدالة تتجاوز RLS على users نفسها بأمان
-- لأنها لا تُرجع سوى الدور فقط، وليست بيانات حساسة أخرى.
-- ---------------------------------------------------------------------
create or replace function public.current_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.users where id = auth.uid();
$$;

create or replace function public.current_user_status()
returns public.user_status
language sql
stable
security definer
set search_path = public
as $$
  select status from public.users where id = auth.uid();
$$;

-- اختصارات تُسهّل قراءة السياسات
create or replace function public.is_super_admin() returns boolean
language sql stable as $$ select public.current_role() = 'super_admin'; $$;

create or replace function public.is_business_admin() returns boolean
language sql stable as $$ select public.current_role() = 'business_admin'; $$;

create or replace function public.is_admin() returns boolean
language sql stable as $$ select public.current_role() in ('super_admin','business_admin'); $$;

create or replace function public.is_agent() returns boolean
language sql stable as $$ select public.current_role() = 'delivery_agent'; $$;

create or replace function public.is_customer() returns boolean
language sql stable as $$ select public.current_role() = 'customer'; $$;

-- ---------------------------------------------------------------------
-- ربط تسجيل مستخدم جديد في Supabase Auth بصف مقابل في public.users
-- ملاحظة: الأدوار (super_admin/business_admin/delivery_agent) تُنشأ
-- يدويًا أو عبر RPC محمي من إداري موجود بالفعل — لا يمكن لأي مستخدم
-- تسجيل نفسه كإداري عبر شاشة التسجيل العامة. الدور الافتراضي: customer.
-- ---------------------------------------------------------------------
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, phone, full_name, role, status)
  values (
    new.id,
    coalesce(new.phone, new.raw_user_meta_data->>'phone'),
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    'customer',
    'active'
  );

  insert into public.customer_profiles (user_id) values (new.id);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- ---------------------------------------------------------------------
-- updated_at تلقائي لكل الجداول التي تحتاجه
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_users_updated_at            before update on public.users            for each row execute function public.set_updated_at();
create trigger trg_agent_profiles_updated_at   before update on public.agent_profiles   for each row execute function public.set_updated_at();
create trigger trg_addresses_updated_at        before update on public.addresses        for each row execute function public.set_updated_at();
create trigger trg_categories_updated_at       before update on public.categories       for each row execute function public.set_updated_at();
create trigger trg_products_updated_at         before update on public.products         for each row execute function public.set_updated_at();
create trigger trg_orders_updated_at           before update on public.orders           for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- تسجيل تلقائي في Audit Log عند أي تغيير على platform_settings
-- (مثال عملي على مبدأ "كل عملية حساسة تُسجَّل تلقائيًا وليس يدويًا")
-- ---------------------------------------------------------------------
create or replace function public.audit_platform_settings()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.audit_log (actor_id, actor_role, action, entity_type, entity_id, old_value, new_value)
  values (
    auth.uid(),
    public.current_role(),
    'platform_settings.update',
    'platform_settings',
    null,
    case when tg_op = 'UPDATE' then to_jsonb(old) else null end,
    to_jsonb(new)
  );
  return new;
end;
$$;

create trigger trg_audit_platform_settings
  after insert or update on public.platform_settings
  for each row execute function public.audit_platform_settings();
