-- =====================================================================
-- 0028_apply_discounts_and_top_customers.sql
-- =====================================================================

-- يُعرَّف هنا أيضًا (بجانب 0029) لأن create_order تحتاجه فورًا ولازم
-- يكون موجودًا وقت تشغيل هذا الملف بغض النظر عن ترتيب الملفات لاحقًا
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
begin
  if public.current_role() <> 'customer' then
    raise exception 'فقط العميل يستطيع إنشاء طلب';
  end if;

  if public.current_user_status() <> 'active' then
    raise exception 'الحساب محظور أو موقوف — يرجى التواصل مع الخدمة';
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
    v_address_json := jsonb_build_object('label', 'عنوان مخصص لهذا الطلب', 'full_address_text', p_custom_address_text);
  end if;

  if p_payment_method <> 'cash' and (p_payment_proof_image_url is null or length(trim(p_payment_proof_image_url)) = 0) then
    raise exception 'يجب رفع صورة إثبات التحويل عند اختيار الدفع الإلكتروني';
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

grant execute on function public.create_order(
  jsonb, uuid, text, public.payment_method, uuid, text, text, text
) to authenticated;


-- ---------------------------------------------------------------------
-- get_active_perks: تُستدعى من واجهة العميل (السلة/الرئيسية) لعرض أي
-- خصم أو عرض مستحق له حاليًا بشكل ملفت، قبل حتى ما يرسل الطلب
-- ---------------------------------------------------------------------
create or replace function public.get_active_perks()
returns table (kind text, label text)
language plpgsql stable security definer set search_path = public
as $$
declare
  v_customer_id uuid := auth.uid();
  v_discount record;
  v_promo record;
  v_recent_count integer;
begin
  select * into v_discount from public.customer_discounts
  where is_active = true and (customer_id = v_customer_id or customer_id is null)
    and (expires_at is null or expires_at > now())
  order by customer_id nulls last limit 1;

  if v_discount is not null then
    return query select 'discount', case when v_discount.discount_type = 'percentage'
      then format('عندك خصم %s%% على رسوم التوصيل', v_discount.value)
      else format('عندك خصم %s ج.م على رسوم التوصيل', v_discount.value) end;
  end if;

  for v_promo in
    select p.* from public.promotions p
    where p.is_active = true and p.condition_type = 'order_count_window'
      and (
        not exists (select 1 from public.promotion_customers pc where pc.promotion_id = p.id)
        or exists (select 1 from public.promotion_customers pc where pc.promotion_id = p.id and pc.customer_id = v_customer_id)
      )
  loop
    select count(*) into v_recent_count
    from public.orders o
    where o.customer_id = v_customer_id
      and o.created_at > now() - make_interval(hours => (v_promo.condition_config->>'window_hours')::int)
      and o.status not in ('rejected', 'canceled_by_customer', 'canceled_by_business');

    if v_recent_count + 1 < (v_promo.condition_config->>'count')::int then
      return query select 'promotion', format(
        'اطلب %s مرة كمان خلال %s ساعة وهيتطبّقلك: %s',
        (v_promo.condition_config->>'count')::int - v_recent_count - 1,
        v_promo.condition_config->>'window_hours',
        v_promo.name
      );
    end if;
  end loop;

  return;
end;
$$;

grant execute on function public.get_active_perks() to authenticated;


-- ---------------------------------------------------------------------
-- get_top_customers: لوحة العملاء الأكثر طلبًا (تقارير الإدارة)
-- ---------------------------------------------------------------------
create or replace function public.get_top_customers(p_limit integer default 10)
returns table (customer_id uuid, full_name text, phone text, order_count bigint, total_spent numeric)
language sql stable security definer set search_path = public
as $$
  select u.id, u.full_name, u.phone,
    count(o.id) filter (where o.status = 'delivered'),
    coalesce(sum(i.grand_total) filter (where o.status = 'delivered' and i.status = 'approved'), 0)
  from public.users u
  join public.orders o on o.customer_id = u.id
  left join public.invoices i on i.order_id = o.id
  where u.role = 'customer'
  group by u.id, u.full_name, u.phone
  order by count(o.id) filter (where o.status = 'delivered') desc
  limit p_limit;
$$;

grant execute on function public.get_top_customers(integer) to authenticated;
