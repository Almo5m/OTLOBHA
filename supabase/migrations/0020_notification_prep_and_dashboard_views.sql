-- =====================================================================
-- 0020_notification_prep_and_dashboard_views.sql
-- =====================================================================

-- ---------------------------------------------------------------------
-- generate_prepared_message: تُستدعى من الواجهة عند وقوع حدث مهم
-- (بعد accept_order / approve_invoice / start_delivery / mark_delivered
--  / reject_order / cancel_order_by_* / fn_create_cancellation_debt)
-- تُرجع رقم العميل ونص الرسالة الجاهز، والواجهة تبني رابط wa.me وتعرض
-- زر "إرسال" — لا إرسال آلي فعلي (قرار عدم وجود ميزانية).
-- ---------------------------------------------------------------------
create or replace function public.generate_prepared_message(p_event_key text, p_order_id uuid)
returns table(customer_phone text, message_text text)
language plpgsql security definer set search_path = public
as $$
declare
  v_template   text;
  v_order      record;
  v_customer   record;
  v_final_text text;
begin
  if not (public.is_admin() or public.is_agent()) then
    raise exception 'غير مصرح';
  end if;

  select body_text into v_template from public.whatsapp_templates
  where event_key = p_event_key and is_active = true;
  if v_template is null then
    raise exception 'لا يوجد قالب رسالة نشط لهذا الحدث: %', p_event_key;
  end if;

  select o.*, i.grand_total from public.orders o
  left join public.invoices i on i.order_id = o.id and i.status = 'approved'
  where o.id = p_order_id into v_order;

  select * into v_customer from public.users where id = v_order.customer_id;

  v_final_text := v_template;
  v_final_text := replace(v_final_text, '{{customer_name}}', coalesce(v_customer.full_name, ''));
  v_final_text := replace(v_final_text, '{{order_number}}', coalesce(v_order.order_number, ''));
  v_final_text := replace(v_final_text, '{{grand_total}}', coalesce(v_order.grand_total::text, ''));
  v_final_text := replace(v_final_text, '{{cancellation_reason}}', coalesce(v_order.cancellation_reason, ''));
  v_final_text := replace(v_final_text, '{{rejection_reason}}', coalesce(v_order.rejection_reason, ''));

  insert into public.notification_log (event_key, channel, recipient_id, status, payload)
  values (p_event_key, 'whatsapp_manual', v_order.customer_id, 'prepared',
    jsonb_build_object('text', v_final_text, 'order_id', p_order_id));

  return query select v_customer.phone, v_final_text;
end;
$$;

grant execute on function public.generate_prepared_message(text, uuid) to authenticated;


-- =====================================================================
-- Views جاهزة لصفحات الداشبورد — مُغلَّفة داخل دوال RPC وليست Views
-- مباشرة، لضمان عدم قراءتها من أي دور غير إداري عبر REST مباشرة
-- (الإحصائيات المجمّعة لا تخضع لفلترة صف-بصف عبر RLS العادي، لذلك
--  التحقق من الدور يتم صراحة داخل كل دالة)
-- =====================================================================

create or replace function public.get_business_dashboard()
returns table (
  new_orders bigint, in_progress_orders bigint, ready_orders bigint,
  on_the_way_orders bigint, completed_orders bigint, canceled_orders bigint
)
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'صلاحية إدارية فقط'; end if;
  return query
  select
    count(*) filter (where status = 'review'),
    count(*) filter (where status in ('accepted','shopping','invoice_preparation')),
    count(*) filter (where status = 'ready_for_delivery'),
    count(*) filter (where status in ('assigned','on_the_way')),
    count(*) filter (where status = 'delivered'),
    count(*) filter (where status in ('canceled_by_customer','canceled_by_business','rejected'))
  from public.orders;
end;
$$;
grant execute on function public.get_business_dashboard() to authenticated;


create or replace function public.get_financial_summary()
returns table (
  total_sales numeric, outstanding_debts numeric, total_customers bigint,
  commission_due numeric, commission_paid numeric
)
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'صلاحية إدارية فقط'; end if;
  return query select
    (select coalesce(sum(grand_total),0) from public.invoices where status = 'approved'),
    (select coalesce(sum(amount),0) from public.debts where status = 'outstanding'),
    (select count(*) from public.users where role = 'customer'),
    -- العمولة التفصيلية Super Admin فقط، Business Admin يرى الإجمالي فقط
    case when public.is_super_admin() then
      (select coalesce(sum(commission_amount),0) from public.commission_ledger where status = 'due')
    else null end,
    case when public.is_super_admin() then
      (select coalesce(sum(commission_amount),0) from public.commission_ledger where status = 'paid')
    else null end;
end;
$$;
grant execute on function public.get_financial_summary() to authenticated;


create or replace function public.get_agent_performance()
returns table (agent_id uuid, full_name text, completed_orders bigint, active_orders bigint, avg_rating numeric)
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'صلاحية إدارية فقط'; end if;
  return query
  select u.id, u.full_name,
    count(o.id) filter (where o.status = 'delivered'),
    count(o.id) filter (where o.status in ('assigned','on_the_way')),
    round(avg(r.stars)::numeric, 2)
  from public.users u
  left join public.orders o on o.assigned_agent_id = u.id
  left join public.ratings r on r.agent_id = u.id
  where u.role = 'delivery_agent'
  group by u.id, u.full_name;
end;
$$;
grant execute on function public.get_agent_performance() to authenticated;


create or replace function public.get_top_products()
returns table (product_name text, times_ordered bigint, total_quantity numeric)
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'صلاحية إدارية فقط'; end if;
  return query
  select coalesce(p.name, oi.manual_name), count(*), sum(oi.quantity)
  from public.order_items oi
  left join public.products p on p.id = oi.product_id
  join public.orders o on o.id = oi.order_id
  where o.status = 'delivered'
  group by coalesce(p.name, oi.manual_name)
  order by count(*) desc;
end;
$$;
grant execute on function public.get_top_products() to authenticated;
