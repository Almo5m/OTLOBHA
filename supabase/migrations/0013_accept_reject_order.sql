-- =====================================================================
-- 0013_accept_reject_order.sql
-- =====================================================================

create or replace function public.accept_order(p_order_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_status public.order_status;
begin
  if not public.is_admin() then
    raise exception 'فقط الإدارة تستطيع قبول الطلب';
  end if;

  select status into v_status from public.orders where id = p_order_id for update;
  if v_status is null then raise exception 'الطلب غير موجود'; end if;
  if v_status <> 'review' then
    raise exception 'لا يمكن قبول طلب في حالته الحالية: %', v_status;
  end if;

  update public.orders set accepted_at = now() where id = p_order_id;

  perform public.fn_transition_order(p_order_id, 'accepted');
  perform public.fn_log_audit('order.accept', 'orders', p_order_id);

  -- انتقال تلقائي فوري لمرحلة الشراء (لا حاجة لفعل بشري إضافي — القسم 25)
  perform public.fn_transition_order(p_order_id, 'shopping');

  -- اختيار مندوب لتنفيذ الشراء فورًا (نفس المندوب سيكمل التوصيل لاحقًا
  -- ما لم يُنقل الطلب — القسم 26/30). إذا لم يتوفر أحد الآن، يبقى الطلب
  -- بلا مندوب مؤقتًا ويمكن للإدارة نفسها متابعة الشراء بصلاحياتها.
  perform public.fn_pick_agent(p_order_id);
end;
$$;

grant execute on function public.accept_order(uuid) to authenticated;


create or replace function public.reject_order(p_order_id uuid, p_reason text)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_status public.order_status;
begin
  if not public.is_admin() then
    raise exception 'فقط الإدارة تستطيع رفض الطلب';
  end if;
  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'يجب إدخال سبب الرفض';
  end if;

  select status into v_status from public.orders where id = p_order_id for update;
  if v_status <> 'review' then
    raise exception 'لا يمكن رفض طلب في حالته الحالية: %', v_status;
  end if;

  update public.orders
  set rejection_reason = p_reason, rejected_by = auth.uid(), rejected_at = now()
  where id = p_order_id;

  perform public.fn_transition_order(p_order_id, 'rejected', p_reason);
  perform public.fn_log_audit('order.reject', 'orders', p_order_id, null, null, p_reason);

  -- TODO (مرحلة الإشعارات): توليد رسالة "تم رفض طلبك" في notification_log
end;
$$;

grant execute on function public.reject_order(uuid, text) to authenticated;
