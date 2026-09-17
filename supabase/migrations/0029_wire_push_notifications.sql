-- =====================================================================
-- 0029_wire_push_notifications.sql
-- تسجيل تلقائي في notification_log (channel='push') عند الأحداث المهمة
-- فقط (القسم 42 من تقرير التصميم) — الإرسال الفعلي يتم عبر Edge Function
-- "send-push" بعد ربط Database Webhook من لوحة Supabase (راجع README).
-- =====================================================================

create or replace function public.fn_queue_push(p_event_key text, p_recipient_id uuid, p_text text)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if p_recipient_id is null then return; end if;
  insert into public.notification_log (event_key, channel, recipient_id, status, payload)
  values (p_event_key, 'push', p_recipient_id, 'prepared', jsonb_build_object('text', p_text));
end;
$$;

-- ---------------------------------------------------------------------
-- accept_order / reject_order
-- ---------------------------------------------------------------------
create or replace function public.accept_order(p_order_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_status public.order_status;
  v_customer uuid;
  v_order_number text;
begin
  if not public.is_admin() then
    raise exception 'فقط الإدارة تستطيع قبول الطلب';
  end if;

  select status, customer_id, order_number into v_status, v_customer, v_order_number
  from public.orders where id = p_order_id for update;
  if v_status is null then raise exception 'الطلب غير موجود'; end if;
  if v_status <> 'review' then
    raise exception 'لا يمكن قبول طلب في حالته الحالية: %', v_status;
  end if;

  update public.orders set accepted_at = now() where id = p_order_id;

  perform public.fn_transition_order(p_order_id, 'accepted');
  perform public.fn_log_audit('order.accept', 'orders', p_order_id);
  perform public.fn_queue_push('order_accepted', v_customer, format('تم قبول طلبك رقم %s وجارٍ تجهيزه', v_order_number));

  perform public.fn_transition_order(p_order_id, 'shopping');
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
  v_customer uuid;
  v_order_number text;
begin
  if not public.is_admin() then
    raise exception 'فقط الإدارة تستطيع رفض الطلب';
  end if;
  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'يجب إدخال سبب الرفض';
  end if;

  select status, customer_id, order_number into v_status, v_customer, v_order_number
  from public.orders where id = p_order_id for update;
  if v_status <> 'review' then
    raise exception 'لا يمكن رفض طلب في حالته الحالية: %', v_status;
  end if;

  update public.orders
  set rejection_reason = p_reason, rejected_by = auth.uid(), rejected_at = now()
  where id = p_order_id;

  perform public.fn_transition_order(p_order_id, 'rejected', p_reason);
  perform public.fn_log_audit('order.reject', 'orders', p_order_id, null, null, p_reason);
  perform public.fn_queue_push('order_rejected', v_customer, format('تم رفض طلبك رقم %s', v_order_number));
end;
$$;

grant execute on function public.reject_order(uuid, text) to authenticated;


-- ---------------------------------------------------------------------
-- approve_invoice
-- ---------------------------------------------------------------------
create or replace function public.approve_invoice(p_invoice_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_order_id uuid;
  v_status   public.invoice_status;
  v_item     record;
  v_customer uuid;
  v_order_number text;
begin
  if not public.is_admin() then
    raise exception 'اعتماد الفاتورة صلاحية إدارية فقط';
  end if;

  select order_id, status into v_order_id, v_status
  from public.invoices where id = p_invoice_id for update;

  if v_status <> 'draft' then
    raise exception 'لا يمكن اعتماد فاتورة ليست في حالة مسودة';
  end if;

  update public.invoices
  set status = 'approved', approved_by = auth.uid(), approved_at = now()
  where id = p_invoice_id;

  for v_item in
    select ii.id as invoice_item_id, ii.product_id, ii.actual_price
    from public.invoice_items ii
    where ii.invoice_id = p_invoice_id and ii.is_available = true and ii.product_id is not null
  loop
    insert into public.product_price_history (product_id, price, source_invoice_item_id)
    values (v_item.product_id, v_item.actual_price, v_item.invoice_item_id);

    update public.products set last_known_price = v_item.actual_price where id = v_item.product_id;
  end loop;

  select customer_id, order_number into v_customer, v_order_number from public.orders where id = v_order_id;

  perform public.fn_transition_order(v_order_id, 'invoice_approved');
  perform public.fn_log_audit('invoice.approve', 'invoices', p_invoice_id);
  perform public.fn_queue_push('invoice_ready', v_customer, format('فاتورة طلبك رقم %s جاهزة', v_order_number));

  perform public.fn_transition_order(v_order_id, 'ready_for_delivery');
  perform public.assign_next_agent(v_order_id);
end;
$$;

grant execute on function public.approve_invoice(uuid) to authenticated;


-- ---------------------------------------------------------------------
-- start_delivery / mark_delivered
-- ---------------------------------------------------------------------
create or replace function public.start_delivery(p_order_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_status public.order_status;
  v_agent  uuid;
  v_customer uuid;
  v_order_number text;
begin
  select status, assigned_agent_id, customer_id, order_number
  into v_status, v_agent, v_customer, v_order_number
  from public.orders where id = p_order_id for update;
  if v_agent <> auth.uid() then raise exception 'هذا الطلب غير مُسند إليك'; end if;
  if v_status <> 'assigned' then raise exception 'لا يمكن بدء التوصيل من هذه الحالة'; end if;

  perform public.fn_transition_order(p_order_id, 'on_the_way');
  perform public.fn_log_audit('order.start_delivery', 'orders', p_order_id);
  perform public.fn_queue_push('on_the_way', v_customer, format('المندوب في الطريق إليك بطلبك رقم %s', v_order_number));
end;
$$;

grant execute on function public.start_delivery(uuid) to authenticated;


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

  insert into public.commission_ledger (order_id, completed_at, delivery_fee_at_time, commission_rate_applied, commission_amount, status)
  values (
    p_order_id, now(), v_delivery_fee, v_commission_rate,
    round((select grand_total - previous_debt_included from public.invoices where id = v_invoice_id) * v_commission_rate, 2),
    'due'
  );

  perform public.fn_log_audit('order.deliver', 'orders', p_order_id);
  perform public.fn_queue_push('delivered', v_customer, format('تم تسليم طلبك رقم %s بنجاح 🎉', v_order_number));
end;
$$;

grant execute on function public.mark_delivered(uuid, boolean) to authenticated;
