-- =====================================================================
-- 0011_helpers_settings_audit.sql
-- دوال مساعدة عامة تُستخدم داخل كل دوال دورة حياة الطلب
-- =====================================================================

create or replace function public.get_setting_numeric(p_key text)
returns numeric
language sql stable security definer set search_path = public
as $$
  select (value #>> '{}')::numeric from public.platform_settings where key = p_key;
$$;

create or replace function public.get_setting_text(p_key text)
returns text
language sql stable security definer set search_path = public
as $$
  select value #>> '{}' from public.platform_settings where key = p_key;
$$;

create or replace function public.get_setting_bool(p_key text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select (value #>> '{}')::boolean from public.platform_settings where key = p_key;
$$;

-- ---------------------------------------------------------------------
-- fn_log_audit: تُستدعى داخل كل دالة RPC حساسة لضمان أن كل عملية
-- تُسجَّل في نفس الـ Transaction، فلا يمكن نجاح العملية دون تسجيلها
-- ---------------------------------------------------------------------
create or replace function public.fn_log_audit(
  p_action      text,
  p_entity_type text,
  p_entity_id   uuid,
  p_old_value   jsonb default null,
  p_new_value   jsonb default null,
  p_reason      text default null
) returns void
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.audit_log (actor_id, actor_role, action, entity_type, entity_id, old_value, new_value, reason)
  values (auth.uid(), public.current_role(), p_action, p_entity_type, p_entity_id, p_old_value, p_new_value, p_reason);
end;
$$;

-- ---------------------------------------------------------------------
-- fn_transition_order: نقطة مرور وحيدة لأي تغيير حالة طلب — تضمن
-- أن كل انتقال يُسجَّل في order_status_history تلقائيًا، ولا يوجد أي
-- طريق آخر لتغيير عمود orders.status في كل الدوال التالية
-- ---------------------------------------------------------------------
create or replace function public.fn_transition_order(
  p_order_id  uuid,
  p_to_status public.order_status,
  p_reason    text default null
) returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_from public.order_status;
begin
  select status into v_from from public.orders where id = p_order_id for update;

  update public.orders set status = p_to_status where id = p_order_id;

  insert into public.order_status_history (order_id, from_status, to_status, changed_by, reason)
  values (p_order_id, v_from, p_to_status, auth.uid(), p_reason);
end;
$$;
