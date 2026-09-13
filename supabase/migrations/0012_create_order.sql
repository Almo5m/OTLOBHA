-- =====================================================================
-- 0012_create_order.sql
-- إنشاء الطلب: يتم استدعاؤها فقط لحظة "إرسال الطلب" النهائية
-- (المراجعة والتعديل قبل ذلك تتم بالكامل على مستوى الواجهة/العميل،
--  فلا داعي لصف "new_order" منفصل في القاعدة قبل الإرسال الفعلي)
-- =====================================================================

create or replace function public.create_order(
  p_items               jsonb,     -- [{type, product_id?, manual_name?, quantity, unit_id, comment?}]
  p_address_id          uuid,      -- عنوان محفوظ للعميل، أو null إذا نص حر
  p_custom_address_text text,      -- عنوان مخصص لهذا الطلب فقط (القسم 11)
  p_payment_method      public.payment_method,
  p_policy_id           uuid
) returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_order_id       uuid;
  v_customer_id    uuid := auth.uid();
  v_address_json   jsonb;
  v_outstanding    numeric(12,2);
  v_delivery_fee   numeric(12,2);
  v_item           jsonb;
  v_displayed_price numeric(12,2);
begin
  if public.current_role() <> 'customer' then
    raise exception 'فقط العميل يستطيع إنشاء طلب';
  end if;

  if public.current_user_status() <> 'active' then
    raise exception 'الحساب محظور أو موقوف — يرجى التواصل مع الخدمة';
  end if;

  -- بناء نسخة العنوان (Snapshot) — من عنوان محفوظ أو نص حر
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

  -- رسوم التوصيل الحالية (تُجمَّد الآن في الطلب)
  v_delivery_fee := coalesce(public.get_setting_numeric('delivery_fee'), 0);

  -- إجمالي المديونية المستحقة الحالية (تُضاف تلقائيًا لهذا الطلب — القسم 36)
  select coalesce(sum(amount), 0) into v_outstanding
  from public.debts where customer_id = v_customer_id and status = 'outstanding';

  insert into public.orders (
    customer_id, status, delivery_address_snapshot, delivery_fee_applied,
    previous_debt_applied, payment_method, policy_version_accepted, policy_accepted_at
  ) values (
    v_customer_id, 'review', v_address_json, v_delivery_fee,
    v_outstanding, p_payment_method,
    (select version from public.policies where id = p_policy_id), now()
  ) returning id into v_order_id;

  -- تسجيل موافقة السياسة
  if p_policy_id is not null then
    insert into public.policy_consents (user_id, policy_id, order_id)
    values (v_customer_id, p_policy_id, v_order_id);
  end if;

  -- إدراج الأصناف
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

  perform public.fn_log_audit('order.create', 'orders', v_order_id, null,
    jsonb_build_object('customer_id', v_customer_id));

  -- محاولة تعيين نفس مندوب آخر طلب سابق ناجح لهذا العميل (تفضيل فقط،
  -- يُستخدم لاحقًا في مرحلة التعيين وليس هنا؛ يُحفَظ كمرجع في الطلب لاحقًا)

  return v_order_id;
end;
$$;

grant execute on function public.create_order(jsonb, uuid, text, public.payment_method, uuid) to authenticated;
