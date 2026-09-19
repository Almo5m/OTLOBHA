-- =====================================================================
-- 0043_agent_self_approve_invoice.sql
-- المندوب يقدر يعتمد فاتورته بنفسه (بعد ما يقدّمها)، من غير ما ينتظر
-- الأدمن أو السوبر أدمن. الأدمن لسه يقدر يعتمدها كمان لو حب يراجعها.
-- =====================================================================

create or replace function public.approve_invoice(p_invoice_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_order_id uuid;
  v_status   public.invoice_status;
  v_agent_id uuid;
  v_item     record;
begin
  select order_id, status into v_order_id, v_status
  from public.invoices where id = p_invoice_id for update;

  if v_order_id is null then raise exception 'الفاتورة غير موجودة'; end if;

  select assigned_agent_id into v_agent_id from public.orders where id = v_order_id;

  if not (public.is_admin() or (public.is_agent() and v_agent_id = auth.uid())) then
    raise exception 'اعتماد الفاتورة صلاحية إدارية أو للمندوب المسند للطلب فقط';
  end if;

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
