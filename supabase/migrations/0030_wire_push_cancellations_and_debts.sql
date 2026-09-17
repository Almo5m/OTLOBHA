-- =====================================================================
-- 0030_wire_push_cancellations_and_debts.sql
-- =====================================================================

create or replace function public.fn_create_cancellation_debt(
  p_customer_id uuid, p_order_id uuid, p_reason public.debt_reason
) returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_is_percentage boolean;
  v_value         numeric;
  v_base_amount   numeric;
  v_amount        numeric;
begin
  v_is_percentage := coalesce(public.get_setting_bool('cancellation_debt_is_percentage'), false);
  v_value := coalesce(public.get_setting_numeric('cancellation_debt_value'), 0);

  if v_value = 0 then
    return;
  end if;

  if v_is_percentage then
    select grand_total into v_base_amount from public.invoices
    where order_id = p_order_id order by created_at desc limit 1;
    v_amount := round(coalesce(v_base_amount, 0) * v_value / 100.0, 2);
  else
    v_amount := v_value;
  end if;

  if v_amount <= 0 then return; end if;

  insert into public.debts (customer_id, order_id, amount, reason, applied_rate_snapshot, status)
  values (
    p_customer_id, p_order_id, v_amount, p_reason,
    jsonb_build_object('is_percentage', v_is_percentage, 'value', v_value),
    'outstanding'
  );

  perform public.fn_log_audit('debt.create', 'debts', p_order_id, null,
    jsonb_build_object('amount', v_amount, 'reason', p_reason));

  perform public.fn_queue_push('debt_created', p_customer_id, format('تم تسجيل مديونية بقيمة %s ج.م على حسابك', v_amount));
end;
$$;


create or replace function public.cancel_order_by_customer(p_order_id uuid, p_reason text default null)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_status      public.order_status;
  v_customer_id uuid;
begin
  select status, customer_id into v_status, v_customer_id from public.orders where id = p_order_id for update;
  if v_customer_id <> auth.uid() then raise exception 'هذا ليس طلبك'; end if;
  if v_status in ('delivered','canceled_by_customer','canceled_by_business','rejected') then
    raise exception 'لا يمكن إلغاء طلب في حالته الحالية';
  end if;

  update public.orders set cancellation_reason = p_reason, canceled_by = auth.uid(), canceled_at = now()
  where id = p_order_id;

  if v_status not in ('review') then
    perform public.fn_create_cancellation_debt(v_customer_id, p_order_id, 'customer_cancellation');
  end if;

  update public.agent_profiles ap
  set availability_status = 'available', current_active_orders_count = greatest(current_active_orders_count - 1, 0)
  from public.orders o
  where o.id = p_order_id and o.assigned_agent_id = ap.user_id and v_status in ('assigned','on_the_way');

  perform public.fn_transition_order(p_order_id, 'canceled_by_customer', p_reason);
  perform public.fn_log_audit('order.cancel_by_customer', 'orders', p_order_id, null, null, p_reason);
end;
$$;

grant execute on function public.cancel_order_by_customer(uuid, text) to authenticated;


create or replace function public.cancel_order_by_business(
  p_order_id uuid, p_reason text, p_is_uncontactable boolean default false
) returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_status      public.order_status;
  v_customer_id uuid;
  v_agent_id    uuid;
  v_order_number text;
begin
  if not public.is_admin() then raise exception 'صلاحية إدارية فقط'; end if;
  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'يجب إدخال سبب الإلغاء';
  end if;

  select status, customer_id, assigned_agent_id, order_number
  into v_status, v_customer_id, v_agent_id, v_order_number
  from public.orders where id = p_order_id for update;

  if v_status in ('delivered','canceled_by_customer','canceled_by_business','rejected') then
    raise exception 'لا يمكن إلغاء طلب في حالته الحالية';
  end if;

  update public.orders set cancellation_reason = p_reason, canceled_by = auth.uid(), canceled_at = now()
  where id = p_order_id;

  if p_is_uncontactable then
    perform public.fn_create_cancellation_debt(v_customer_id, p_order_id, 'uncontactable');
  end if;

  if v_agent_id is not null and v_status in ('assigned','on_the_way') then
    update public.agent_profiles
    set availability_status = 'available', current_active_orders_count = greatest(current_active_orders_count - 1, 0)
    where user_id = v_agent_id;
  end if;

  perform public.fn_transition_order(p_order_id, 'canceled_by_business', p_reason);
  perform public.fn_log_audit('order.cancel_by_business', 'orders', p_order_id, null, null, p_reason);
  perform public.fn_queue_push('order_canceled', v_customer_id, format('تم إلغاء طلبك رقم %s', v_order_number));
end;
$$;

grant execute on function public.cancel_order_by_business(uuid, text, boolean) to authenticated;
