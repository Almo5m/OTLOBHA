-- =====================================================================
-- 0046_security_hardening.sql
-- تقوية أمنية شاملة: سحب صلاحيات التنفيذ من الجمهور، إصلاح فحوصات الملكية
-- مع المستخدم غير المسجّل، إغلاق سياسات الكتابة المباشرة، وجلسات حقيقية.
-- ملاحظة: أي دالة جديدة بعد هذا الملف لازم تاخد grant execute صريح.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) صلاحيات تنفيذ الدوال: سحب من الجميع ثم منح صريح
-- ---------------------------------------------------------------------
do $$
declare
  fn record;
begin
  for fn in
    select p.oid::regprocedure as signature
    from pg_proc p
    where p.pronamespace = 'public'::regnamespace
      and p.prokind in ('f', 'p')
      and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', fn.signature);
  end loop;
end
$$;

alter default privileges for role postgres revoke execute on functions from public;
alter default privileges for role postgres in schema public revoke execute on functions from anon, authenticated;

-- ---------------------------------------------------------------------
-- 2) دوال معدّلة
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
  if auth.uid() is null or v_agent is distinct from auth.uid() then raise exception 'هذا الطلب غير مُسند إليك'; end if;
  if v_status <> 'assigned' then raise exception 'لا يمكن بدء التوصيل من هذه الحالة'; end if;

  perform public.fn_transition_order(p_order_id, 'on_the_way');
  perform public.fn_log_audit('order.start_delivery', 'orders', p_order_id);
  perform public.fn_queue_push('on_the_way', v_customer, format('المندوب في الطريق إليك بطلبك رقم %s', v_order_number));
end;
$$;

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
  if auth.uid() is null or v_agent is distinct from auth.uid() then raise exception 'هذا الطلب غير مُسند إليك'; end if;
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

create or replace function public.cancel_order_by_customer(p_order_id uuid, p_reason text default null)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_status      public.order_status;
  v_customer_id uuid;
begin
  select status, customer_id into v_status, v_customer_id from public.orders where id = p_order_id for update;
  if auth.uid() is null or v_customer_id is distinct from auth.uid() then raise exception 'هذا ليس طلبك'; end if;
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

create or replace function public.transfer_order(p_order_id uuid, p_reason text)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_status public.order_status;
  v_current_agent uuid;
begin
  select status, assigned_agent_id into v_status, v_current_agent from public.orders where id = p_order_id for update;
  if auth.uid() is null or v_current_agent is distinct from auth.uid() then raise exception 'هذا الطلب غير مُسند إليك'; end if;
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

  if auth.uid() is null or v_current_agent is distinct from auth.uid() then
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

  if v_order.id is null then
    raise exception 'الطلب غير موجود';
  end if;
  if not public.is_admin() and v_order.assigned_agent_id is distinct from auth.uid() then
    raise exception 'غير مصرح';
  end if;

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

create or replace function public.get_top_customers(p_limit integer default 10)
returns table (customer_id uuid, full_name text, phone text, order_count bigint, total_spent numeric)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'صلاحية إدارية فقط';
  end if;

  return query
  select u.id, u.full_name, u.phone,
    count(o.id) filter (where o.status = 'delivered'),
    coalesce(sum(i.grand_total) filter (where o.status = 'delivered' and i.status = 'approved'), 0)
  from public.users u
  join public.orders o on o.customer_id = u.id
  left join public.invoices i on i.order_id = o.id
  where u.role = 'customer'
  group by u.id, u.full_name, u.phone
  order by count(o.id) filter (where o.status = 'delivered') desc
  limit least(greatest(coalesce(p_limit, 10), 1), 100);
end;
$$;

create or replace function public.create_order(
  p_items               jsonb,
  p_address_id          uuid,
  p_custom_address_text text,
  p_payment_method      public.payment_method,
  p_policy_id           uuid,
  p_payment_proof_image_url text default null,
  p_payment_sender_name     text default null,
  p_payment_sender_number   text default null
) returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_order_id       uuid;
  v_customer_id    uuid := auth.uid();
  v_address_json   jsonb;
  v_outstanding    numeric(12,2);
  v_delivery_fee   numeric(12,2);
  v_original_fee   numeric(12,2);
  v_item           jsonb;
  v_displayed_price numeric(12,2);

  v_discount       record;
  v_promo          record;
  v_applied_discount_id  uuid;
  v_applied_promotion_id uuid;
  v_recent_orders_count  integer;
  v_new_order_number     text;
  v_active_orders        integer;
  v_max_active_orders    integer;
begin
  if public.current_role() <> 'customer' then
    raise exception 'فقط العميل يستطيع إنشاء طلب';
  end if;

  if public.current_user_status() <> 'active' then
    raise exception 'الحساب محظور أو موقوف — يرجى التواصل مع الخدمة';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'الطلب يجب أن يحتوي على صنف واحد على الأقل';
  end if;
  if jsonb_array_length(p_items) > 100 then
    raise exception 'عدد الأصناف في الطلب الواحد لا يمكن أن يتجاوز 100 صنف';
  end if;

  perform 1 from public.users where id = v_customer_id for update;
  v_max_active_orders := coalesce(public.get_setting_numeric('max_active_orders_per_customer'), 5)::integer;
  select count(*) into v_active_orders from public.orders
  where customer_id = v_customer_id
    and status not in ('delivered', 'canceled_by_customer', 'canceled_by_business', 'rejected');
  if v_active_orders >= v_max_active_orders then
    raise exception 'لديك % طلبات قيد التنفيذ بالفعل — انتظر اكتمال أحدها قبل إنشاء طلب جديد', v_active_orders;
  end if;

  if p_address_id is not null then
    select jsonb_build_object(
      'label', label, 'full_address_text', full_address_text
    ) into v_address_json
    from public.addresses
    where id = p_address_id and customer_id = v_customer_id;

    if v_address_json is null then
      raise exception 'العنوان غير موجود أو لا يخصك';
    end if;
  else
    if p_custom_address_text is null or length(trim(p_custom_address_text)) = 0 then
      raise exception 'يجب تحديد عنوان للتسليم';
    end if;
    if length(p_custom_address_text) > 500 then
      raise exception 'العنوان طويل جدًا';
    end if;
    v_address_json := jsonb_build_object('label', 'عنوان مخصص لهذا الطلب', 'full_address_text', p_custom_address_text);
  end if;

  if p_payment_method <> 'cash' and (p_payment_proof_image_url is null or length(trim(p_payment_proof_image_url)) = 0) then
    raise exception 'يجب رفع صورة إثبات التحويل عند اختيار الدفع الإلكتروني';
  end if;

  if p_payment_proof_image_url is not null
     and (length(p_payment_proof_image_url) > 500
          or p_payment_proof_image_url !~ '^https://res\.cloudinary\.com/[A-Za-z0-9_-]+/image/upload/[^[:space:]]+$') then
    raise exception 'رابط صورة الإثبات غير صالح';
  end if;
  if length(coalesce(p_payment_sender_name, '')) > 100 or length(coalesce(p_payment_sender_number, '')) > 50 then
    raise exception 'بيانات المُرسِل طويلة جدًا';
  end if;

  v_original_fee := coalesce(public.get_setting_numeric('delivery_fee'), 0);
  v_delivery_fee := v_original_fee;

  -- ---------------------------------------------------------------
  -- 1) خصم ثابت (لعميل محدد أولاً، وإلا خصم عام نشط)
  -- ---------------------------------------------------------------
  select * into v_discount from public.customer_discounts
  where is_active = true and customer_id = v_customer_id
    and (expires_at is null or expires_at > now())
  limit 1;

  if v_discount is null then
    select * into v_discount from public.customer_discounts
    where is_active = true and customer_id is null
      and (expires_at is null or expires_at > now())
    limit 1;
  end if;

  if v_discount is not null then
    if v_discount.discount_type = 'percentage' then
      v_delivery_fee := greatest(v_delivery_fee - round(v_delivery_fee * v_discount.value / 100.0, 2), 0);
    else
      v_delivery_fee := greatest(v_delivery_fee - v_discount.value, 0);
    end if;
    v_applied_discount_id := v_discount.id;
  end if;

  -- ---------------------------------------------------------------
  -- 2) عرض مشروط (order_count_window) — لو مؤهّل، بيُطبَّق فوق الخصم
  --    الثابت (يُحتسب على الرسوم بعد الخصم الثابت، أيهما أوفر للعميل)
  -- ---------------------------------------------------------------
  for v_promo in
    select p.* from public.promotions p
    where p.is_active = true and p.condition_type = 'order_count_window'
      and (
        not exists (select 1 from public.promotion_customers pc where pc.promotion_id = p.id)
        or exists (select 1 from public.promotion_customers pc where pc.promotion_id = p.id and pc.customer_id = v_customer_id)
      )
  loop
    select count(*) into v_recent_orders_count
    from public.orders o
    where o.customer_id = v_customer_id
      and o.created_at > now() - make_interval(hours => (v_promo.condition_config->>'window_hours')::int)
      and o.status not in ('rejected', 'canceled_by_customer', 'canceled_by_business');

    -- +1 لحساب الطلب الحالي اللي بيتنشئ دلوقتي
    if (v_recent_orders_count + 1) = (v_promo.condition_config->>'count')::int
       and not exists (
         select 1 from public.promotion_redemptions r
         where r.promotion_id = v_promo.id and r.customer_id = v_customer_id
           and r.redeemed_at > now() - make_interval(hours => (v_promo.condition_config->>'window_hours')::int)
       )
    then
      if v_promo.reward_type = 'free_delivery' then
        v_delivery_fee := 0;
      elsif v_promo.reward_type = 'delivery_discount_percent' then
        v_delivery_fee := greatest(v_delivery_fee - round(v_delivery_fee * v_promo.reward_value / 100.0, 2), 0);
      else
        v_delivery_fee := greatest(v_delivery_fee - v_promo.reward_value, 0);
      end if;
      v_applied_promotion_id := v_promo.id;
      exit; -- عرض واحد بس لكل طلب
    end if;
  end loop;

  select coalesce(sum(amount), 0) into v_outstanding
  from public.debts where customer_id = v_customer_id and status = 'outstanding';

  insert into public.orders (
    customer_id, status, delivery_address_snapshot, delivery_fee_applied, delivery_fee_original,
    applied_discount_id, applied_promotion_id,
    previous_debt_applied, payment_method, policy_version_accepted, policy_accepted_at
  ) values (
    v_customer_id, 'review', v_address_json, v_delivery_fee, v_original_fee,
    v_applied_discount_id, v_applied_promotion_id,
    v_outstanding, p_payment_method,
    (select version from public.policies where id = p_policy_id), now()
  ) returning id into v_order_id;

  if v_applied_promotion_id is not null then
    insert into public.promotion_redemptions (promotion_id, customer_id, order_id)
    values (v_applied_promotion_id, v_customer_id, v_order_id);
  end if;

  if p_policy_id is not null then
    insert into public.policy_consents (user_id, policy_id, order_id)
    values (v_customer_id, p_policy_id, v_order_id);
  end if;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    if (v_item->>'quantity') is null or (v_item->>'quantity')::numeric <= 0 or (v_item->>'quantity')::numeric > 1000 then
      raise exception 'كمية غير صالحة';
    end if;
    if length(coalesce(v_item->>'comment', '')) > 500 or length(coalesce(v_item->>'manual_name', '')) > 200 then
      raise exception 'اسم الصنف أو التعليق طويل جدًا';
    end if;
    if v_item->>'type' is distinct from 'catalog' and length(trim(coalesce(v_item->>'manual_name', ''))) = 0 then
      raise exception 'اسم الصنف مطلوب';
    end if;

    if v_item->>'type' = 'catalog' then
      select last_known_price into v_displayed_price
      from public.products where id = (v_item->>'product_id')::uuid;

      insert into public.order_items (
        order_id, product_id, item_type, quantity, unit_id,
        customer_comment, displayed_price_snapshot
      ) values (
        v_order_id, (v_item->>'product_id')::uuid, 'catalog',
        (v_item->>'quantity')::numeric, (v_item->>'unit_id')::uuid,
        v_item->>'comment', v_displayed_price
      );
    else
      insert into public.order_items (
        order_id, product_id, item_type, manual_name, quantity, unit_id, customer_comment
      ) values (
        v_order_id, null, 'manual', v_item->>'manual_name',
        (v_item->>'quantity')::numeric, (v_item->>'unit_id')::uuid, v_item->>'comment'
      );
    end if;
  end loop;

  insert into public.order_status_history (order_id, from_status, to_status, changed_by)
  values (v_order_id, null, 'review', v_customer_id);

  if p_payment_method <> 'cash' and p_payment_proof_image_url is not null then
    insert into public.payment_proofs (order_id, image_url, sender_name, sender_number)
    values (v_order_id, p_payment_proof_image_url, p_payment_sender_name, p_payment_sender_number);
  end if;

  perform public.fn_log_audit('order.create', 'orders', v_order_id, null,
    jsonb_build_object('customer_id', v_customer_id));

  -- إشعار فوري لكل الإداريين (Business/Super Admin) بطلب جديد — أهم إشعار
  -- في المشروع كله، عشان محدش يفوّته حتى لو الموقع قافل قدامه
  select order_number into v_new_order_number from public.orders where id = v_order_id;
  perform public.fn_queue_push('new_order_admin', u.id, format('طلب جديد رقم %s بانتظار المراجعة', v_new_order_number))
  from public.users u where u.role in ('business_admin', 'super_admin');

  return v_order_id;
end;
$$;

create or replace function public.request_password_reset(p_customer_phone text)
returns text
language plpgsql security definer set search_path = public, extensions
as $$
declare
  v_user_id uuid;
  v_target_role public.user_role;
  v_raw_token text;
begin
  if not public.is_admin() then raise exception 'صلاحية إدارية فقط'; end if;

  select id, role into v_user_id, v_target_role from public.users where phone = p_customer_phone;
  if v_user_id is null then raise exception 'لا يوجد عميل بهذا الرقم'; end if;

  if v_target_role = 'super_admin' then
    raise exception 'لا يمكن إصدار رابط استرجاع لحساب Super Admin من هنا';
  end if;
  if v_target_role <> 'customer' and not public.is_super_admin() then
    raise exception 'استرجاع كلمة مرور الموظفين صلاحية Super Admin فقط';
  end if;

  update public.password_reset_tokens set used_at = now() where user_id = v_user_id and used_at is null;

  v_raw_token := encode(gen_random_bytes(32), 'hex');

  insert into public.password_reset_tokens (user_id, token_hash, expires_at, created_by)
  values (v_user_id, encode(digest(v_raw_token, 'sha256'), 'hex'), now() + interval '30 minutes', auth.uid());

  perform public.fn_log_audit('password_reset.request', 'users', v_user_id);

  return v_raw_token;
end;
$$;

create or replace function public.confirm_password_reset(p_token text, p_new_password text)
returns void
language plpgsql security definer set search_path = public, extensions
as $$
declare
  v_token_hash text;
  v_user_id    uuid;
begin
  if length(p_new_password) < 8 then
    raise exception 'كلمة المرور يجب ألا تقل عن 8 أحرف';
  end if;
  if octet_length(p_new_password) > 72 then
    raise exception 'كلمة المرور طويلة جدًا';
  end if;

  v_token_hash := encode(digest(p_token, 'sha256'), 'hex');

  select user_id into v_user_id
  from public.password_reset_tokens
  where token_hash = v_token_hash and used_at is null and expires_at > now();

  if v_user_id is null then
    raise exception 'الرابط غير صالح أو منتهي الصلاحية';
  end if;

  update auth.users
  set encrypted_password = crypt(p_new_password, gen_salt('bf', 10))
  where id = v_user_id;

  update public.password_reset_tokens set used_at = now() where user_id = v_user_id and used_at is null;

  perform public.fn_revoke_user_sessions(v_user_id);

  perform public.fn_log_audit('password_reset.confirm', 'users', v_user_id);
end;
$$;

-- ---------------------------------------------------------------------
-- 3) جلسات حقيقية: تسجيل من السيرفر + إنهاء فعلي للجلسة في Supabase Auth
-- ---------------------------------------------------------------------
alter table public.user_sessions add column if not exists auth_session_id uuid;
create unique index if not exists user_sessions_auth_session_id_key
  on public.user_sessions (auth_session_id) where auth_session_id is not null;

create or replace function public.fn_revoke_user_sessions(p_user_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  update public.user_sessions set revoked_at = now() where user_id = p_user_id and revoked_at is null;
  delete from auth.sessions where user_id = p_user_id;
end;
$$;

create or replace function public.record_session(p_device_info text default null)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_user_id         uuid := auth.uid();
  v_auth_session_id uuid := nullif(auth.jwt() ->> 'session_id', '')::uuid;
  v_ip              text := nullif(trim(split_part(coalesce(nullif(current_setting('request.headers', true), '')::json ->> 'x-forwarded-for', ''), ',', 1)), '');
begin
  if v_user_id is null then
    raise exception 'غير مصرح';
  end if;

  if v_auth_session_id is not null then
    update public.user_sessions set last_active_at = now()
    where auth_session_id = v_auth_session_id and user_id = v_user_id;
    if found then return; end if;
  elsif exists (
    select 1 from public.user_sessions
    where user_id = v_user_id and created_at > now() - interval '1 minute'
  ) then
    return;
  end if;

  insert into public.user_sessions (user_id, device_info, ip_address, auth_session_id)
  values (v_user_id, left(p_device_info, 300), v_ip, v_auth_session_id)
  on conflict (auth_session_id) where auth_session_id is not null do nothing;
end;
$$;

create or replace function public.revoke_session(p_session_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_user_id         uuid;
  v_auth_session_id uuid;
begin
  if not public.is_super_admin() then
    raise exception 'صلاحية Super Admin فقط';
  end if;

  select user_id, auth_session_id into v_user_id, v_auth_session_id
  from public.user_sessions where id = p_session_id for update;

  if v_user_id is null then
    raise exception 'الجلسة غير موجودة';
  end if;

  update public.user_sessions set revoked_at = now(), revoked_by = auth.uid()
  where id = p_session_id and revoked_at is null;

  if v_auth_session_id is not null then
    delete from auth.sessions where id = v_auth_session_id;
  else
    delete from auth.sessions where user_id = v_user_id;
  end if;

  perform public.fn_log_audit('session.revoke', 'users', v_user_id);
end;
$$;

create or replace function public.fn_revoke_sessions_on_block()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if old.status = 'active' and new.status <> 'active' then
    perform public.fn_revoke_user_sessions(new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_users_revoke_sessions_on_block on public.users;
create trigger trg_users_revoke_sessions_on_block
  after update of status on public.users
  for each row execute function public.fn_revoke_sessions_on_block();

-- ---------------------------------------------------------------------
-- 4) تحديد معدل الطلبات (بحدود ثابتة داخل الداتابيز، مش من العميل)
-- ---------------------------------------------------------------------
create table if not exists public.rate_limits (
  bucket_key   text primary key,
  window_start timestamptz not null,
  hits         integer not null
);
alter table public.rate_limits enable row level security;

create or replace function public.consume_rate_limit(p_action text)
returns boolean
language plpgsql security definer set search_path = public
as $$
declare
  v_max_hits       integer;
  v_window_seconds integer;
  v_key            text;
  v_hits           integer;
begin
  if auth.uid() is null then
    raise exception 'غير مصرح';
  end if;

  case p_action
    when 'cloudinary_sign' then v_max_hits := 20; v_window_seconds := 600;
    else raise exception 'إجراء غير معروف';
  end case;

  v_key := auth.uid()::text || ':' || p_action;

  insert into public.rate_limits as r (bucket_key, window_start, hits)
  values (v_key, now(), 1)
  on conflict (bucket_key) do update set
    hits = case when r.window_start < now() - make_interval(secs => v_window_seconds) then 1 else r.hits + 1 end,
    window_start = case when r.window_start < now() - make_interval(secs => v_window_seconds) then now() else r.window_start end
  returning hits into v_hits;

  return v_hits <= v_max_hits;
end;
$$;

-- ---------------------------------------------------------------------
-- 5) سياسات الأمان (RLS): إغلاق الكتابة المباشرة، وتضييق الباقي
-- ---------------------------------------------------------------------
drop policy if exists reset_tokens_admin_create on public.password_reset_tokens;
drop policy if exists orders_insert_customer on public.orders;
drop policy if exists order_items_insert_customer on public.order_items;
drop policy if exists order_items_update_before_confirm on public.order_items;
drop policy if exists order_items_update_actual_price on public.order_items;
drop policy if exists audit_log_insert_system on public.audit_log;
drop policy if exists sessions_insert_own on public.user_sessions;
drop policy if exists sessions_update_super_admin on public.user_sessions;

drop policy if exists customer_profile_owner_update on public.customer_profiles;
create policy customer_profile_admin_update on public.customer_profiles
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists ratings_insert_customer on public.ratings;
create policy ratings_insert_customer on public.ratings
  for insert with check (
    customer_id = auth.uid()
    and exists (
      select 1 from public.orders o
      where o.id = order_id
        and o.customer_id = auth.uid()
        and o.status = 'delivered'
        and o.assigned_agent_id = agent_id
    )
  );

drop policy if exists complaints_insert_customer on public.complaints;
create policy complaints_insert_customer on public.complaints
  for insert with check (
    customer_id = auth.uid()
    and status = 'new'
    and resolved_at is null
    and resolved_by is null
    and (
      (order_id is null and agent_id is null)
      or exists (
        select 1 from public.orders o
        where o.id = order_id
          and o.customer_id = auth.uid()
          and o.status = 'delivered'
          and o.assigned_agent_id is not distinct from agent_id
      )
    )
  );

drop policy if exists settings_read_all on public.platform_settings;
create policy settings_read_public on public.platform_settings
  for select using (
    public.is_admin()
    or key not in ('commission_rate', 'max_active_orders_per_customer')
  );

-- ---------------------------------------------------------------------
-- 6) حماية الأعمدة الحساسة من التعديل المباشر عبر REST
--    (الدوال الداخلية SECURITY DEFINER تشتغل بصلاحية المالك فمش متأثرة)
-- ---------------------------------------------------------------------
create or replace function public.fn_guard_user_protected_columns()
returns trigger
language plpgsql set search_path = public
as $$
begin
  if current_user in ('authenticated', 'anon') and not public.is_admin() then
    if new.role is distinct from old.role
       or new.status is distinct from old.status
       or new.phone is distinct from old.phone then
      raise exception 'لا يمكن تعديل هذه البيانات' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_users_guard_protected_columns on public.users;
create trigger trg_users_guard_protected_columns
  before update on public.users
  for each row execute function public.fn_guard_user_protected_columns();

create or replace function public.fn_guard_agent_profile_counter()
returns trigger
language plpgsql set search_path = public
as $$
begin
  if current_user in ('authenticated', 'anon') and not public.is_admin() then
    if tg_op = 'INSERT' and new.current_active_orders_count <> 0 then
      raise exception 'لا يمكن تعديل هذه البيانات' using errcode = '42501';
    end if;
    if tg_op = 'UPDATE' and new.current_active_orders_count is distinct from old.current_active_orders_count then
      raise exception 'لا يمكن تعديل هذه البيانات' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_agent_profiles_guard_counter on public.agent_profiles;
create trigger trg_agent_profiles_guard_counter
  before insert or update on public.agent_profiles
  for each row execute function public.fn_guard_agent_profile_counter();

-- ---------------------------------------------------------------------
-- 7) منح صلاحيات التنفيذ الصريحة
-- ---------------------------------------------------------------------
grant execute on function
  public.is_admin(), public.is_agent(), public.is_customer(),
  public.is_super_admin(), public.is_business_admin(),
  public.current_role(), public.current_user_status(),
  public.fn_slugify(text),
  public.get_popular_products(integer), public.get_active_perks(),
  public.search_products(text, integer),
  public.confirm_password_reset(text, text)
to anon, authenticated;

grant execute on function
  public.accept_order(uuid), public.reject_order(uuid, text),
  public.admin_claim_order(uuid), public.admin_retry_agent_assignment(uuid),
  public.approve_invoice(uuid), public.cancel_invoice(uuid, text),
  public.cancel_order_by_business(uuid, text, boolean),
  public.cancel_order_by_customer(uuid, text),
  public.create_order(jsonb, uuid, text, public.payment_method, uuid, text, text, text),
  public.decline_shopping_assignment(uuid, text),
  public.generate_prepared_message(text, uuid),
  public.get_agent_performance(), public.get_business_dashboard(),
  public.get_financial_summary(), public.get_top_customers(integer),
  public.get_top_products(),
  public.mark_delivered(uuid, boolean), public.start_delivery(uuid),
  public.transfer_order(uuid, text),
  public.record_commission_payment(numeric, date, date, text),
  public.record_item_purchase(uuid, numeric, boolean, text),
  public.request_password_reset(text), public.review_payment_proof(uuid, boolean, text),
  public.settle_debt(uuid, numeric, text), public.submit_for_invoice(uuid),
  public.record_session(text), public.revoke_session(uuid),
  public.consume_rate_limit(text)
to authenticated;
