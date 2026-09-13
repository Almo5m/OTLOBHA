-- =====================================================================
-- 0015_submit_for_invoice.sql
-- تُستدعى بعد أن ينتهي المندوب/الإداري من تسجيل كل الأصناف
-- =====================================================================

-- إضافة عمودين للربط التاريخي (منتج/صنف الطلب الأصلي) — ضروريان
-- لتحديث product_price_history بدقة عند اعتماد الفاتورة لاحقًا
alter table public.invoice_items add column if not exists product_id uuid references public.products(id);
alter table public.invoice_items add column if not exists order_item_id uuid references public.order_items(id);

create or replace function public.submit_for_invoice(p_order_id uuid)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_status        public.order_status;
  v_agent_id      uuid;
  v_unresolved    integer;
  v_invoice_id    uuid;
  v_items_total   numeric(12,2);
  v_delivery_fee  numeric(12,2);
  v_prev_debt     numeric(12,2);
  v_grand_total   numeric(12,2);
  v_payment_method public.payment_method;
begin
  select status, assigned_agent_id, delivery_fee_applied, previous_debt_applied, payment_method
  into v_status, v_agent_id, v_delivery_fee, v_prev_debt, v_payment_method
  from public.orders where id = p_order_id for update;

  if v_status <> 'shopping' then
    raise exception 'لا يمكن تجهيز الفاتورة إلا من حالة الشراء';
  end if;
  if not (public.is_admin() or (public.is_agent() and v_agent_id = auth.uid())) then
    raise exception 'غير مصرح لك';
  end if;

  select count(*) into v_unresolved
  from public.order_items where order_id = p_order_id and is_available is null;
  if v_unresolved > 0 then
    raise exception 'يوجد % صنف لم يُحسم بعد (متوفر/غير متوفر)', v_unresolved;
  end if;

  select coalesce(sum(actual_price * quantity), 0) into v_items_total
  from public.order_items where order_id = p_order_id and is_available = true;

  v_grand_total := v_items_total + v_delivery_fee + v_prev_debt;

  insert into public.invoices (
    order_id, status, items_total, delivery_fee, previous_debt_included,
    grand_total, payment_method, payment_status
  ) values (
    p_order_id, 'draft', v_items_total, v_delivery_fee, v_prev_debt,
    v_grand_total, v_payment_method, 'unpaid'
  ) returning id into v_invoice_id;

  insert into public.invoice_items (invoice_id, product_name, quantity, unit_name, actual_price, line_total, is_available, product_id, order_item_id)
  select
    v_invoice_id,
    coalesce(p.name, oi.manual_name),
    oi.quantity,
    su.name,
    oi.actual_price,
    case when oi.is_available then oi.actual_price * oi.quantity else 0 end,
    oi.is_available,
    oi.product_id,
    oi.id
  from public.order_items oi
  left join public.products p on p.id = oi.product_id
  join public.sale_units su on su.id = oi.unit_id
  where oi.order_id = p_order_id;

  perform public.fn_transition_order(p_order_id, 'invoice_preparation');
  perform public.fn_log_audit('invoice.prepare', 'invoices', v_invoice_id, null,
    jsonb_build_object('grand_total', v_grand_total));

  return v_invoice_id;
end;
$$;

grant execute on function public.submit_for_invoice(uuid) to authenticated;
