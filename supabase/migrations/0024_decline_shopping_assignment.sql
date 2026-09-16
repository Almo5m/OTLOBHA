-- =====================================================================
-- 0024_decline_shopping_assignment.sql
-- المندوب المُسند تلقائيًا وقت القبول (مرحلة الشراء) يقدر يرفض بسبب
-- مقنع، والطلب يتحول لمندوب تاني عبر نفس خوارزمية التعيين الذكي —
-- بدون ما تتغير حالة الطلب نفسها (يفضل shopping/invoice_preparation).
-- =====================================================================

create or replace function public.decline_shopping_assignment(p_order_id uuid, p_reason text)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_status public.order_status;
  v_current_agent uuid;
begin
  select status, assigned_agent_id into v_status, v_current_agent
  from public.orders where id = p_order_id for update;

  if v_current_agent is null or v_current_agent <> auth.uid() then
    raise exception 'هذا الطلب غير مُسند إليك';
  end if;

  if v_status not in ('shopping', 'invoice_preparation') then
    raise exception 'لا يمكن رفض الطلب في هذه المرحلة — استخدم نقل الطلب أثناء التوصيل بدل ذلك';
  end if;

  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'يجب كتابة سبب مقنع لرفض الطلب';
  end if;

  -- نفس سجل order_transfers المستخدم في مرحلة التوصيل — مرئي لـ Super Admin فقط
  insert into public.order_transfers (order_id, from_agent_id, reason)
  values (p_order_id, v_current_agent, p_reason);

  update public.agent_profiles
  set availability_status = 'available', current_active_orders_count = greatest(current_active_orders_count - 1, 0)
  where user_id = v_current_agent;

  update public.orders set assigned_agent_id = null where id = p_order_id;

  perform public.fn_log_audit('order.decline_shopping', 'orders', p_order_id, null, null, p_reason);

  -- إعادة المحاولة فورًا عبر نفس خوارزمية التعيين الذكي (بدون تغيير حالة الطلب)
  perform public.fn_pick_agent(p_order_id);
end;
$$;

grant execute on function public.decline_shopping_assignment(uuid, text) to authenticated;
