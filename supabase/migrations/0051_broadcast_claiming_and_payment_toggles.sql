-- =====================================================================
-- 0051_broadcast_claiming_and_payment_toggles.sql
-- (1) إلغاء خوارزمية التعيين الذكي (fn_pick_agent) نهائيًا: الطلب بعد
--     قبول الإدارة بيبقى متاح لكل المندوبين مع بعض، وأول واحد يضغط
--     "قبول الطلب" هو اللي بياخده. التنافس بين مندوبين في نفس اللحظة
--     محلول بالكامل جوه قاعدة البيانات (قفل على صف الطلب)، مش في الواجهة.
-- (2) Super Admin يقدر يوقف/يشغّل الدفع بالمحفظة أو InstaPay من الإعدادات
--     — الدفع كاش يفضل متاح دايمًا.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) إعدادات جديدة
-- ---------------------------------------------------------------------
insert into public.platform_settings (key, value) values
  ('wallet_payment_enabled', 'true'::jsonb),
  ('instapay_payment_enabled', 'true'::jsonb)
on conflict (key) do nothing;

-- ---------------------------------------------------------------------
-- 2) سياسة جديدة: المندوب يشوف الطلبات المتاحة (مش متعيّنة لحد) عشان
--    يقدر يستلمها — بشرط صريح إنه مندوب فعلاً (لولا الشرط ده أي عميل
--    كان هيقدر يشوف طلبات عملاء تانيين لسه مالهاش مندوب، وده تسريب بيانات)
-- ---------------------------------------------------------------------
create policy orders_select_agent_pool on public.orders
  for select using (
    public.is_agent()
    and assigned_agent_id is null
    and status in ('shopping', 'ready_for_delivery')
  );

-- ---------------------------------------------------------------------
-- 3) claim_order: استلام أول مندوب يضغط، بشكل آمن من التسابق (Race-Safe)
-- ---------------------------------------------------------------------
create or replace function public.claim_order(p_order_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_status  public.order_status;
  v_claimed uuid;
begin
  if not public.is_agent() then
    raise exception 'استلام الطلبات متاح للمندوبين فقط';
  end if;
  if public.current_user_status() <> 'active' then
    raise exception 'حسابك محظور أو موقوف';
  end if;

  -- القفل هنا (for update) هو اللي بيضمن، لو مندوبين ضغطوا في نفس اللحظة
  -- بالظبط، إن التاني يستنى لحد ما الأول يخلّص، وبعدها يشوف إن الطلب
  -- اتاخد فعلاً ويترفض — مش ممكن اتنين ياخدوا نفس الطلب أبدًا
  select status into v_status from public.orders where id = p_order_id for update;
  if v_status is null then raise exception 'الطلب غير موجود'; end if;
  if v_status not in ('shopping', 'ready_for_delivery') then
    raise exception 'الطلب ده مش متاح للاستلام دلوقتي';
  end if;

  update public.orders set assigned_agent_id = auth.uid()
  where id = p_order_id and assigned_agent_id is null
  returning assigned_agent_id into v_claimed;

  if v_claimed is null then
    raise exception 'الطلب ده اتاخد بالفعل من مندوب تاني — جرّب طلب تاني';
  end if;

  insert into public.agent_profiles (user_id) values (auth.uid()) on conflict (user_id) do nothing;
  update public.agent_profiles
  set current_active_orders_count = current_active_orders_count + 1
  where user_id = auth.uid();

  if v_status = 'ready_for_delivery' then
    perform public.fn_transition_order(p_order_id, 'assigned');
  end if;

  perform public.fn_log_audit('order.claim', 'orders', p_order_id, null,
    jsonb_build_object('agent_id', auth.uid()));
end;
$$;

grant execute on function public.claim_order(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 4) accept_order: يخلّي الطلب "شراء" بدون ما يعيّن مندوب بنفسه — بيفضل
--    متاح للكل لحد ما حد يستلمه بنفسه عن طريق claim_order
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

  -- بث فوري لكل المندوبين إن فيه طلب جديد متاح (زر "قبول الطلب" هيظهر
  -- فورًا في شاشتهم من غير ما يحتاجوا يعملوا Refresh، لأن التغيير في
  -- جدول orders نفسه — اللي هما مشتركين فيه Realtime بالفعل)
end;
$$;

-- ---------------------------------------------------------------------
-- 5) decline_shopping_assignment: المندوب يسيب الطلب فيرجع للمجموعة
--    المتاحة لأي مندوب تاني، من غير أي إعادة تعيين تلقائية
-- ---------------------------------------------------------------------
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

  if v_current_agent is distinct from auth.uid() then
    raise exception 'هذا الطلب غير مُسند إليك';
  end if;

  if v_status not in ('shopping', 'invoice_preparation') then
    raise exception 'لا يمكن رفض الطلب في هذه المرحلة — استخدم نقل الطلب أثناء التوصيل بدل ذلك';
  end if;

  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'يجب كتابة سبب مقنع لرفض الطلب';
  end if;

  insert into public.order_transfers (order_id, from_agent_id, reason)
  values (p_order_id, v_current_agent, p_reason);

  update public.agent_profiles
  set current_active_orders_count = greatest(current_active_orders_count - 1, 0)
  where user_id = v_current_agent;

  update public.orders set assigned_agent_id = null where id = p_order_id;

  perform public.fn_log_audit('order.decline_shopping', 'orders', p_order_id, null, null, p_reason);
end;
$$;

-- ---------------------------------------------------------------------
-- 6) assign_next_agent: بعد اعتماد الفاتورة، لو المندوب اللي اشترى
--    لسه متعيّن (الحالة الطبيعية) ينتقل لمرحلة "معيّن للتوصيل". لو حصل
--    (نادرًا) إنه ماكانش متعيّن أصلًا، الطلب بيرجع لمجموعة الاستلام
--    المتاحة لأي مندوب — مفيش خوارزمية تختار بدل حد
-- ---------------------------------------------------------------------
create or replace function public.assign_next_agent(p_order_id uuid)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_agent uuid;
begin
  select assigned_agent_id into v_agent from public.orders where id = p_order_id;

  if v_agent is not null then
    perform public.fn_transition_order(p_order_id, 'assigned');
  end if;

  return v_agent;
end;
$$;

-- fn_pick_agent كانت بتنفّذ "الخوارزمية الذكية" (الأقل طلبات نشطة، تفضيل
-- آخر مندوب وصّل للعميل). اتلغت نهائيًا لصالح البث لكل المندوبين
drop function if exists public.fn_pick_agent(uuid);

-- admin_retry_agent_assignment كانت بتستخدم fn_pick_agent لمحاولة تعيين
-- مندوب يدويًا لو الخوارزمية فشلت وقت القبول. مفيش حالة فشل دلوقتي —
-- الطلب دايمًا متاح لأي مندوب لحد ما حد يستلمه، فالدالة دي بقت بلا فايدة
drop function if exists public.admin_retry_agent_assignment(uuid);

-- ---------------------------------------------------------------------
-- 7) create_order: رفض الدفع بطريقة موقوفة من الإعدادات (كاش دايمًا متاح)
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
  v_target_price    numeric(12,2);
  v_quantity        numeric(10,3);
  v_unit_id         uuid;

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

  if p_payment_method = 'wallet' and not coalesce(public.get_setting_bool('wallet_payment_enabled'), true) then
    raise exception 'الدفع بالمحفظة الإلكترونية متوقف مؤقتًا — اختر طريقة دفع تانية';
  end if;
  if p_payment_method = 'instapay' and not coalesce(public.get_setting_bool('instapay_payment_enabled'), true) then
    raise exception 'الدفع بـ InstaPay متوقف مؤقتًا — اختر طريقة دفع تانية';
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
    if length(coalesce(v_item->>'comment', '')) > 500 or length(coalesce(v_item->>'manual_name', '')) > 200 then
      raise exception 'اسم الصنف أو التعليق طويل جدًا';
    end if;
    if v_item->>'type' is distinct from 'catalog' and length(trim(coalesce(v_item->>'manual_name', ''))) = 0 then
      raise exception 'اسم الصنف مطلوب';
    end if;

    if v_item->>'type' = 'catalog' then
      if (v_item->>'quantity') is null or (v_item->>'quantity')::numeric <= 0 or (v_item->>'quantity')::numeric > 1000 then
        raise exception 'كمية غير صالحة';
      end if;

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
      -- ميزانية بدل كمية/وحدة؟ (العميل قال "بـ150 جنيه" مثلًا بدل "2 كيلو")
      v_target_price := null;
      if (v_item->>'target_price') is not null and length(v_item->>'target_price') > 0 then
        v_target_price := (v_item->>'target_price')::numeric;
        if v_target_price <= 0 or v_target_price > 100000 then
          raise exception 'ميزانية غير صالحة';
        end if;
        v_quantity := null;
        v_unit_id := null;
      else
        if (v_item->>'quantity') is null or (v_item->>'quantity')::numeric <= 0 or (v_item->>'quantity')::numeric > 1000 then
          raise exception 'كمية غير صالحة';
        end if;
        v_quantity := (v_item->>'quantity')::numeric;
        v_unit_id := (v_item->>'unit_id')::uuid;
      end if;

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
        manual_category_id, manual_image_url, target_price
      ) values (
        v_order_id, null, 'manual', v_item->>'manual_name',
        v_quantity, v_unit_id, v_item->>'comment',
        v_manual_category_id, v_manual_image_url, v_target_price
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
