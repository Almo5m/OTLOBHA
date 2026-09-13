-- =====================================================================
-- 0014_record_item_purchase.sql
-- =====================================================================

create or replace function public.record_item_purchase(
  p_order_item_id     uuid,
  p_actual_price      numeric,      -- null إذا غير متوفر
  p_is_available      boolean,
  p_unavailable_reason text default null
) returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_order_id uuid;
  v_status   public.order_status;
  v_agent_id uuid;
begin
  select oi.order_id, o.status, o.assigned_agent_id
  into v_order_id, v_status, v_agent_id
  from public.order_items oi join public.orders o on o.id = oi.order_id
  where oi.id = p_order_item_id
  for update;

  if v_order_id is null then raise exception 'الصنف غير موجود'; end if;
  if v_status <> 'shopping' then
    raise exception 'لا يمكن تسجيل الشراء إلا أثناء مرحلة الشراء';
  end if;

  if not (public.is_admin() or (public.is_agent() and v_agent_id = auth.uid())) then
    raise exception 'غير مصرح لك بتسجيل هذا الصنف';
  end if;

  if p_is_available and (p_actual_price is null or p_actual_price < 0) then
    raise exception 'يجب إدخال سعر فعلي صحيح للصنف المتوفر';
  end if;

  update public.order_items
  set actual_price = case when p_is_available then p_actual_price else null end,
      is_available = p_is_available,
      unavailable_reason = case when p_is_available then null else p_unavailable_reason end
  where id = p_order_item_id;

  perform public.fn_log_audit('order_item.record_purchase', 'order_items', p_order_item_id,
    null, jsonb_build_object('is_available', p_is_available, 'actual_price', p_actual_price));

  -- TODO (مرحلة الإشعارات): إذا p_is_available = false، توليد إشعار للعميل بالمنتج غير المتوفر
end;
$$;

grant execute on function public.record_item_purchase(uuid, numeric, boolean, text) to authenticated;
