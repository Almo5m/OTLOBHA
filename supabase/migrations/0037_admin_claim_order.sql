-- =====================================================================
-- 0037_admin_claim_order.sql
-- تفعيل استقبال Business Admin (وSuper Admin) للطلبات زي أي مندوب:
-- (1) عن طريق مسار زر يدوي "أنا هوصّله بنفسي" على طلب معيّن
-- (2) أو عن طريق التعيين التلقائي العادي، ما دام عنده صف agent_profiles
--     وحاطط حالته "متاح" — وده بقى متاح تلقائيًا من الـmigration اللي قبل
--     دي (0036) لأي Business Admin برضو، مش Delivery Agent بس.
-- =====================================================================

-- وسّع الـtrigger عشان يشمل business_admin كمان، مش delivery_agent بس
create or replace function public.fn_ensure_agent_profile()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.role in ('delivery_agent', 'business_admin') then
    insert into public.agent_profiles (user_id)
    values (new.id)
    on conflict (user_id) do nothing;
  elsif old.role is not null and old.role in ('delivery_agent', 'business_admin') and new.role not in ('delivery_agent', 'business_admin') then
    update public.agent_profiles set availability_status = 'offline' where user_id = new.id;
  end if;
  return new;
end;
$$;

-- تصحيح فوري لأي Business Admin حالي
insert into public.agent_profiles (user_id)
select id from public.users where role = 'business_admin'
on conflict (user_id) do nothing;

-- استقبال طلب معيّن يدويًا بدل انتظار مندوب
create or replace function public.admin_claim_order(p_order_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_status public.order_status;
  v_existing_agent uuid;
begin
  if not public.is_admin() then
    raise exception 'هذا الإجراء متاح للإدارة فقط';
  end if;

  select status, assigned_agent_id into v_status, v_existing_agent
  from public.orders where id = p_order_id for update;

  if v_status is null then raise exception 'الطلب غير موجود'; end if;
  if v_status not in ('shopping', 'invoice_preparation', 'invoice_approved', 'ready_for_delivery') then
    raise exception 'لا يمكن استلام الطلب في حالته الحالية: %', v_status;
  end if;
  if v_existing_agent = auth.uid() then
    raise exception 'الطلب متعيّن لك بالفعل';
  end if;

  insert into public.agent_profiles (user_id) values (auth.uid()) on conflict (user_id) do nothing;

  if v_existing_agent is not null then
    update public.agent_profiles
    set availability_status = 'available', current_active_orders_count = greatest(current_active_orders_count - 1, 0)
    where user_id = v_existing_agent;
  end if;

  update public.orders set assigned_agent_id = auth.uid() where id = p_order_id;
  update public.agent_profiles
  set availability_status = 'busy', current_active_orders_count = current_active_orders_count + 1
  where user_id = auth.uid();

  if v_status = 'ready_for_delivery' then
    perform public.fn_transition_order(p_order_id, 'assigned');
  end if;

  perform public.fn_log_audit('order.admin_claim', 'orders', p_order_id, null, jsonb_build_object('agent_id', auth.uid()));
end;
$$;

grant execute on function public.admin_claim_order(uuid) to authenticated;
