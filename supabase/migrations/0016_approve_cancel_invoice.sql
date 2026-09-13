-- =====================================================================
-- 0016_approve_cancel_invoice.sql
-- =====================================================================

create or replace function public.approve_invoice(p_invoice_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_order_id uuid;
  v_status   public.invoice_status;
  v_item     record;
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

  perform public.fn_transition_order(v_order_id, 'invoice_approved');
  perform public.fn_log_audit('invoice.approve', 'invoices', p_invoice_id);

  perform public.fn_transition_order(v_order_id, 'ready_for_delivery');

  perform public.assign_next_agent(v_order_id);
end;
$$;

grant execute on function public.approve_invoice(uuid) to authenticated;


create or replace function public.cancel_invoice(p_invoice_id uuid, p_reason text)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_order_id uuid;
  v_status   public.invoice_status;
  v_new_invoice_id uuid;
begin
  if not public.is_admin() then raise exception 'صلاحية إدارية فقط'; end if;
  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'يجب إدخال سبب إلغاء الفاتورة';
  end if;

  select order_id, status into v_order_id, v_status from public.invoices where id = p_invoice_id;
  if v_status <> 'approved' then
    raise exception 'يمكن فقط إلغاء فاتورة معتمدة لتصحيحها';
  end if;

  update public.invoices
  set status = 'canceled', canceled_reason = p_reason, canceled_by = auth.uid(), canceled_at = now()
  where id = p_invoice_id;

  perform public.fn_log_audit('invoice.cancel', 'invoices', p_invoice_id, null, null, p_reason);

  perform public.fn_transition_order(v_order_id, 'invoice_preparation', p_reason);

  v_new_invoice_id := public.submit_for_invoice(v_order_id);

  update public.invoices set superseded_by_invoice_id = v_new_invoice_id where id = p_invoice_id;

  return v_new_invoice_id;
end;
$$;

grant execute on function public.cancel_invoice(uuid, text) to authenticated;
