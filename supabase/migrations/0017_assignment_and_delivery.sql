-- =====================================================================
-- 0017_assignment_and_delivery.sql
-- =====================================================================

-- ---------------------------------------------------------------------
-- fn_pick_agent: يختار مندوبًا وفق منطق التعيين الذكي (القسم 30) ويربطه
-- بالطلب دون تغيير حالة الطلب نفسها. يُستخدم مرتين في حياة الطلب:
-- (1) عند القبول لبدء الشراء، (2) عند الوصول لـ ready_for_delivery إن
-- لم يكن هناك مندوب مرتبط بالفعل (مثلاً إذا لم يتوفر أحد وقت القبول).
-- ---------------------------------------------------------------------
create or replace function public.fn_pick_agent(p_order_id uuid)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_customer_id      uuid;
  v_preferred_agent  uuid;
  v_chosen_agent     uuid;
begin
  select customer_id into v_customer_id from public.orders where id = p_order_id;

  select o.assigned_agent_id into v_preferred_agent
  from public.orders o
  where o.customer_id = v_customer_id and o.status = 'delivered' and o.assigned_agent_id is not null
  order by o.delivered_at desc
  limit 1;

  if v_preferred_agent is not null then
    perform 1 from public.agent_profiles
    where user_id = v_preferred_agent and availability_status = 'available';
    if found then
      v_chosen_agent := v_preferred_agent;
    end if;
  end if;

  if v_chosen_agent is null then
    select user_id into v_chosen_agent
    from public.agent_profiles
    where availability_status = 'available'
    order by current_active_orders_count asc
    limit 1;
  end if;

  if v_chosen_agent is null then
    perform public.fn_log_audit('order.assignment_pending', 'orders', p_order_id);
    return null;
  end if;

  update public.orders set assigned_agent_id = v_chosen_agent where id = p_order_id;
  update public.agent_profiles
  set availability_status = 'busy', current_active_orders_count = current_active_orders_count + 1
  where user_id = v_chosen_agent;

  perform public.fn_log_audit('order.pick_agent', 'orders', p_order_id, null,
    jsonb_build_object('agent_id', v_chosen_agent));

  return v_chosen_agent;
end;
$$;

-- ---------------------------------------------------------------------
-- assign_next_agent: تُستدعى عند approve_invoice — تضمن وجود مندوب
-- مرتبط بالطلب (يحاول الاختيار إن لم يكن هناك مندوب من مرحلة الشراء)
-- ثم تُحوّل حالة الطلب إلى assigned فقط إذا توفّر مندوب فعليًا.
-- ---------------------------------------------------------------------
create or replace function public.assign_next_agent(p_order_id uuid)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_agent uuid;
begin
  select assigned_agent_id into v_agent from public.orders where id = p_order_id;

  if v_agent is null then
    v_agent := public.fn_pick_agent(p_order_id);
  end if;

  if v_agent is not null then
    perform public.fn_transition_order(p_order_id, 'assigned');
  end if;

  return v_agent;
end;
$$;

-- لا EXECUTE عام لأي دور — تُستدعى داخليًا فقط من دوال أخرى بنفس صلاحية DEFINER


-- ---------------------------------------------------------------------
-- start_delivery: المندوب يبدأ التوصيل فعليًا
-- ---------------------------------------------------------------------
create or replace function public.start_delivery(p_order_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_status public.order_status;
  v_agent  uuid;
begin
  select status, assigned_agent_id into v_status, v_agent from public.orders where id = p_order_id for update;
  if v_agent <> auth.uid() then raise exception 'هذا الطلب غير مُسند إليك'; end if;
  if v_status <> 'assigned' then raise exception 'لا يمكن بدء التوصيل من هذه الحالة'; end if;

  perform public.fn_transition_order(p_order_id, 'on_the_way');
  perform public.fn_log_audit('order.start_delivery', 'orders', p_order_id);
end;
$$;

grant execute on function public.start_delivery(uuid) to authenticated;


-- ---------------------------------------------------------------------
-- mark_delivered: القاعدة الأهم — لا اكتمال إلا بعد تأكيد استلام المبلغ
-- ---------------------------------------------------------------------
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
begin
  select status, assigned_agent_id into v_status, v_agent from public.orders where id = p_order_id for update;
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

  -- تحرير المندوب
  update public.agent_profiles
  set availability_status = 'available', current_active_orders_count = greatest(current_active_orders_count - 1, 0)
  where user_id = v_agent;

  -- تسجيل العمولة (نسخة مجمّدة من النسبة الحالية — القسم 50/51)
  select delivery_fee_applied into v_delivery_fee from public.orders where id = p_order_id;
  v_commission_rate := coalesce(public.get_setting_numeric('commission_rate'), 0);

  insert into public.commission_ledger (order_id, completed_at, delivery_fee_at_time, commission_rate_applied, commission_amount, status)
  values (
    p_order_id, now(), v_delivery_fee, v_commission_rate,
    round((select grand_total - previous_debt_included from public.invoices where id = v_invoice_id) * v_commission_rate, 2),
    'due'
  );

  perform public.fn_log_audit('order.deliver', 'orders', p_order_id);

  -- TODO (مرحلة الإشعارات): Push + رسالة واتساب جاهزة "تم التسليم" + إتاحة التقييم في الواجهة
end;
$$;

grant execute on function public.mark_delivered(uuid, boolean) to authenticated;


-- ---------------------------------------------------------------------
-- transfer_order: المندوب يعجز عن الإكمال — القسم 31
-- ---------------------------------------------------------------------
create or replace function public.transfer_order(p_order_id uuid, p_reason text)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_status public.order_status;
  v_current_agent uuid;
begin
  select status, assigned_agent_id into v_status, v_current_agent from public.orders where id = p_order_id for update;
  if v_current_agent <> auth.uid() then raise exception 'هذا الطلب غير مُسند إليك'; end if;
  if v_status not in ('assigned','on_the_way') then
    raise exception 'لا يمكن نقل الطلب من هذه الحالة';
  end if;
  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'يجب إدخال سبب عدم القدرة على إكمال الطلب';
  end if;

  insert into public.order_transfers (order_id, from_agent_id, reason)
  values (p_order_id, v_current_agent, p_reason);

  update public.agent_profiles
  set availability_status = 'available', current_active_orders_count = greatest(current_active_orders_count - 1, 0)
  where user_id = v_current_agent;

  update public.orders set assigned_agent_id = null where id = p_order_id;
  perform public.fn_transition_order(p_order_id, 'ready_for_delivery', p_reason);

  perform public.fn_log_audit('order.transfer', 'orders', p_order_id, null, null, p_reason);
  -- ملاحظة: التفاصيل هنا محفوظة في order_transfers المرئي لـ Super Admin فقط،
  -- audit_log لا يحتوي اسم المندوب الجديد لاحقًا لضمان عدم كشف تفاصيل النقل

  perform public.assign_next_agent(p_order_id);
end;
$$;

grant execute on function public.transfer_order(uuid, text) to authenticated;
