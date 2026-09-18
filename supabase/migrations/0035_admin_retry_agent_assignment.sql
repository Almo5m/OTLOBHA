-- =====================================================================
-- 0035_admin_retry_agent_assignment.sql
-- لو مفيش مندوب متاح وقت قبول الطلب أصلاً، fn_pick_agent بيرجّع null
-- والطلب فضل معلّق من غير ما حد يعرف (وده اللي كان بيظهر كـ"جاري
-- التجهيز" من غير أي حد يقدر يحرّكه). الدالة دي بتدي الأدمن زرار صريح
-- لإعادة محاولة تعيين مندوب بمجرد ما حد يبقى متاح.
-- =====================================================================

create or replace function public.admin_retry_agent_assignment(p_order_id uuid)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_status public.order_status;
  v_existing_agent uuid;
  v_agent uuid;
begin
  if not public.is_admin() then
    raise exception 'فقط الإدارة تستطيع إعادة محاولة تعيين مندوب';
  end if;

  select status, assigned_agent_id into v_status, v_existing_agent
  from public.orders where id = p_order_id for update;

  if v_status is null then raise exception 'الطلب غير موجود'; end if;
  if v_existing_agent is not null then raise exception 'الطلب متعيّن له مندوب بالفعل'; end if;
  if v_status not in ('shopping', 'ready_for_delivery') then
    raise exception 'لا يمكن تعيين مندوب في حالة الطلب الحالية: %', v_status;
  end if;

  v_agent := public.fn_pick_agent(p_order_id);

  if v_agent is not null and v_status = 'ready_for_delivery' then
    perform public.fn_transition_order(p_order_id, 'assigned');
  end if;

  perform public.fn_log_audit('order.retry_agent_assignment', 'orders', p_order_id, null,
    jsonb_build_object('agent_id', v_agent));

  return v_agent;
end;
$$;

grant execute on function public.admin_retry_agent_assignment(uuid) to authenticated;
