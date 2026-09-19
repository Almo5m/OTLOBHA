-- =====================================================================
-- 0038_fix_commission_base.sql
-- تصحيح أساس حساب العمولة: كانت بتتحسب على إجمالي الفاتورة (قيمة
-- المشتريات) بدل ما تتحسب على رسوم التوصيل بس، زي ما هو متفق عليه فعليًا
-- (عمولة 10% على توصيل 20 ج.م = 2 ج.م، مش 10% من قيمة الطلب كله).
-- =====================================================================

create or replace function public.mark_delivered(p_order_id uuid, p_payment_received boolean)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_status public.order_status;
  v_agent  uuid;
  v_invoice_id uuid;
  v_delivery_fee numeric(12,2);
  v_commission_rate numeric(6,4);
  v_customer uuid;
  v_order_number text;
begin
  select status, assigned_agent_id, customer_id, order_number
  into v_status, v_agent, v_customer, v_order_number
  from public.orders where id = p_order_id for update;
  if v_agent <> auth.uid() then raise exception 'هذا الطلب غير مُسند إليك'; end if;
  if v_status <> 'on_the_way' then raise exception 'لا يمكن تأكيد التسليم من هذه الحالة'; end if;

  if not p_payment_received then
    raise exception 'لا يمكن تأكيد التسليم قبل استلام المبلغ من العميل';
  end if;

  update public.orders set delivered_at = now() where id = p_order_id;
  perform public.fn_transition_order(p_order_id, 'delivered');

  select id into v_invoice_id from public.invoices where order_id = p_order_id and status = 'approved';
  if v_invoice_id is not null then
    update public.invoices set payment_status = 'paid' where id = v_invoice_id;
  end if;

  update public.agent_profiles
  set availability_status = 'available', current_active_orders_count = greatest(current_active_orders_count - 1, 0)
  where user_id = v_agent;

  select delivery_fee_applied into v_delivery_fee from public.orders where id = p_order_id;
  v_commission_rate := coalesce(public.get_setting_numeric('commission_rate'), 0);

  -- العمولة على رسوم التوصيل فقط، مش على إجمالي قيمة الفاتورة
  insert into public.commission_ledger (order_id, completed_at, delivery_fee_at_time, commission_rate_applied, commission_amount, status)
  values (
    p_order_id, now(), v_delivery_fee, v_commission_rate,
    round(v_delivery_fee * v_commission_rate, 2),
    'due'
  );

  perform public.fn_log_audit('order.deliver', 'orders', p_order_id);
  perform public.fn_queue_push('delivered', v_customer, format('تم تسليم طلبك رقم %s بنجاح 🎉', v_order_number));
end;
$$;

grant execute on function public.mark_delivered(uuid, boolean) to authenticated;
