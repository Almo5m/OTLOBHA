-- =====================================================================
-- 0025_online_payment_proof.sql
-- نظام دفع أونلاين بالتحقق اليدوي: العميل يحوّل على بيانات حساب ظاهرة
-- من لوحة التحكم، ويرفع صورة التحويل + اسم/رقم المُحوِّل وقت تأكيد
-- الطلب على السعر التقريبي الظاهر، مع توضيح واضح إن السعر النهائي
-- يُحسم لما المندوب يشتري ويُعتمد الفاتورة (لا علاقة للمبلغ المُحوَّل
-- بالمبلغ التقريبي مباشرة — هو فقط إثبات نية الدفع/التحويل).
-- =====================================================================

create type public.payment_proof_status as enum ('pending', 'verified', 'rejected');

create table public.payment_proofs (
  id             uuid primary key default gen_random_uuid(),
  order_id       uuid not null unique references public.orders(id) on delete cascade,
  image_url      text not null,
  sender_name    text,
  sender_number  text,
  status         public.payment_proof_status not null default 'pending',
  reviewed_by    uuid references public.users(id),
  reviewed_at    timestamptz,
  notes          text,
  submitted_at   timestamptz not null default now()
);

comment on table public.payment_proofs is
  'إثبات تحويل يدوي (Screenshot) — تحقق بشري من الإدارة، وليس بوابة دفع فعلية';

alter table public.payment_proofs enable row level security;

create policy payment_proofs_select_customer on public.payment_proofs
  for select using (
    exists (select 1 from public.orders o where o.id = order_id and o.customer_id = auth.uid())
  );
create policy payment_proofs_select_admin on public.payment_proofs
  for select using (public.is_admin());
create policy payment_proofs_update_admin on public.payment_proofs
  for update using (public.is_admin());

-- الإدراج يتم فقط عبر create_order (SECURITY DEFINER) وليس مباشرة من الواجهة

create index idx_payment_proofs_status on public.payment_proofs (status);

-- إعدادات بيانات الحسابات — تُدار من لوحة التحكم (Super Admin فقط للكتابة،
-- ونفس سياسة settings_read_all الموجودة بالفعل تسمح بالقراءة العامة)
insert into public.platform_settings (key, value) values
  ('payment_wallet_details',   '{"number": "", "name": ""}'::jsonb),
  ('payment_instapay_details', '{"handle": "", "name": ""}'::jsonb)
on conflict (key) do nothing;

-- ---------------------------------------------------------------------
-- تحديث create_order لقبول بيانات إثبات الدفع اختياريًا وحفظها
-- بنفس الـTransaction (ذرّية كاملة: إما الطلب+الإثبات معًا أو ولا حاجة)
-- ملحوظة: لازم نحذف التوقيع القديم أولاً، وإلا PostgreSQL هيعتبر الدالة
-- الجديدة Overload منفصل بدل استبدال، وده هيسبب غموض عند الاستدعاء
-- بالأسماء (Named Parameters) من الواجهة.
-- ---------------------------------------------------------------------
drop function if exists public.create_order(jsonb, uuid, text, public.payment_method, uuid);

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
  v_item           jsonb;
  v_displayed_price numeric(12,2);
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

  v_delivery_fee := coalesce(public.get_setting_numeric('delivery_fee'), 0);

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

  return v_order_id;
end;
$$;

grant execute on function public.create_order(
  jsonb, uuid, text, public.payment_method, uuid, text, text, text
) to authenticated;

-- ---------------------------------------------------------------------
-- مراجعة إثبات الدفع من الإدارة
-- ---------------------------------------------------------------------
create or replace function public.review_payment_proof(p_proof_id uuid, p_approve boolean, p_notes text default null)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'صلاحية إدارية فقط'; end if;

  update public.payment_proofs
  set status = case when p_approve then 'verified' else 'rejected' end,
      reviewed_by = auth.uid(), reviewed_at = now(), notes = p_notes
  where id = p_proof_id;

  perform public.fn_log_audit(
    case when p_approve then 'payment_proof.verify' else 'payment_proof.reject' end,
    'payment_proofs', p_proof_id, null, null, p_notes
  );
end;
$$;

grant execute on function public.review_payment_proof(uuid, boolean, text) to authenticated;
