-- =====================================================================
-- 0049_manual_product_requests.sql
-- المنتج اللي العميل بيطلبه يدويًا (مش موجود في الكتالوج) بيحتاج بيانات
-- منظّمة أكتر عشان الأدمن يقدر يحوّله لمنتج حقيقي بضغطة واحدة بدل ما
-- يقعد يسأل العميل تاني أو يخمّن. بنضيف: تصنيف مبدئي مقترح من العميل،
-- صورة مرجعية لو حبّ يرفعها، وعلامة توضح إن الطلب اتحوّل لمنتج فعلي
-- (عشان يختفي من قائمة "طلبات جديدة" عند الأدمن ومايتكررش).
-- =====================================================================

alter table public.order_items
  add column manual_category_id uuid references public.categories(id),
  add column manual_image_url text,
  add column converted_product_id uuid references public.products(id),
  add column dismissed_at timestamptz;

-- ---------------------------------------------------------------------
-- تحديث create_order عشان يقبل ويسجّل البيانات الجديدة للصنف اليدوي
-- ---------------------------------------------------------------------
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
  v_manual_category_id uuid;
  v_manual_image_url   text;

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
      exit;
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
      -- التصنيف المقترح لازم يكون قسم حقيقي فعلاً (مش أي uuid اتبعت)
      v_manual_category_id := null;
      if (v_item->>'category_id') is not null and length(v_item->>'category_id') > 0 then
        select id into v_manual_category_id from public.categories where id = (v_item->>'category_id')::uuid;
      end if;

      -- صورة مرجعية لازم تكون فعلاً من Cloudinary لو موجودة
      v_manual_image_url := nullif(trim(coalesce(v_item->>'image_url', '')), '');
      if v_manual_image_url is not null
         and (length(v_manual_image_url) > 500
              or v_manual_image_url !~ '^https://res\.cloudinary\.com/[A-Za-z0-9_-]+/image/upload/[^[:space:]]+$') then
        v_manual_image_url := null;
      end if;

      insert into public.order_items (
        order_id, product_id, item_type, manual_name, quantity, unit_id, customer_comment,
        manual_category_id, manual_image_url
      ) values (
        v_order_id, null, 'manual', v_item->>'manual_name',
        (v_item->>'quantity')::numeric, (v_item->>'unit_id')::uuid, v_item->>'comment',
        v_manual_category_id, v_manual_image_url
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

  select order_number into v_new_order_number from public.orders where id = v_order_id;
  perform public.fn_queue_push('new_order_admin', u.id, format('طلب جديد رقم %s بانتظار المراجعة', v_new_order_number))
  from public.users u where u.role in ('business_admin', 'super_admin');

  return v_order_id;
end;
$$;

grant execute on function public.create_order(jsonb, uuid, text, public.payment_method, uuid, text, text, text) to authenticated;

-- ---------------------------------------------------------------------
-- ربط طلب يدوي بمنتج اتضاف فعليًا للكتالوج — يشيله من قائمة "طلبات جديدة"
-- ---------------------------------------------------------------------
create or replace function public.mark_product_request_converted(p_order_item_id uuid, p_product_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'صلاحية إدارية فقط';
  end if;
  if p_product_id is null then
    raise exception 'لازم تحدد المنتج اللي اتحوّل له الطلب';
  end if;

  update public.order_items
  set converted_product_id = p_product_id
  where id = p_order_item_id and item_type = 'manual';

  perform public.fn_log_audit('product_request.converted', 'order_items', p_order_item_id, null,
    jsonb_build_object('product_id', p_product_id));
end;
$$;

grant execute on function public.mark_product_request_converted(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------
-- تجاهل طلب منتج من غير ما يتحوّل لمنتج حقيقي (يختفي من القائمة بس
-- بيانات الطلب الأصلي متتأثرش خالص)
-- ---------------------------------------------------------------------
create or replace function public.dismiss_product_request(p_order_item_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'صلاحية إدارية فقط';
  end if;

  update public.order_items
  set dismissed_at = now()
  where id = p_order_item_id and item_type = 'manual';
end;
$$;

grant execute on function public.dismiss_product_request(uuid) to authenticated;
