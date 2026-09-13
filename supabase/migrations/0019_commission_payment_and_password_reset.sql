-- =====================================================================
-- 0019_commission_payment_and_password_reset.sql
-- =====================================================================

-- ---------------------------------------------------------------------
-- record_commission_payment — القسم 52، Super Admin فقط
-- ---------------------------------------------------------------------
create or replace function public.record_commission_payment(
  p_amount numeric, p_period_from date, p_period_to date, p_notes text default null
) returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_id uuid;
begin
  if not public.is_super_admin() then raise exception 'صلاحية Super Admin فقط'; end if;
  if p_amount <= 0 then raise exception 'مبلغ غير صحيح'; end if;

  insert into public.commission_payments (amount, period_from, period_to, recorded_by, notes)
  values (p_amount, p_period_from, p_period_to, auth.uid(), p_notes)
  returning id into v_id;

  update public.commission_ledger
  set status = 'paid'
  where status = 'due' and completed_at::date between p_period_from and p_period_to;

  perform public.fn_log_audit('commission.record_payment', 'commission_payments', v_id, null,
    jsonb_build_object('amount', p_amount));

  return v_id;
end;
$$;

grant execute on function public.record_commission_payment(numeric, date, date, text) to authenticated;


-- =====================================================================
-- استرجاع كلمة المرور — بدون OTP وبدون أي تكلفة (القسم 10 المُحدَّث)
-- التدفق: الإداري يتحقق هاتفيًا من هوية العميل، ثم يستدعي
-- request_password_reset الذي يُصدر رمزًا، والواجهة تبني رابطًا وتعرض
-- زر "إرسال عبر واتساب" (Click-to-Chat) بنفس آلية القسم F. العميل يفتح
-- الرابط ويضع كلمة مرور جديدة بنفسه عبر confirm_password_reset.
-- =====================================================================

create or replace function public.request_password_reset(p_customer_phone text)
returns text     -- يُعيد الرمز الخام (Raw Token) مرة واحدة فقط ليُبنى منه الرابط
language plpgsql security definer set search_path = public
as $$
declare
  v_user_id uuid;
  v_raw_token text;
begin
  if not public.is_admin() then raise exception 'صلاحية إدارية فقط'; end if;

  select id into v_user_id from public.users where phone = p_customer_phone;
  if v_user_id is null then raise exception 'لا يوجد عميل بهذا الرقم'; end if;

  v_raw_token := encode(gen_random_bytes(32), 'hex');

  insert into public.password_reset_tokens (user_id, token_hash, expires_at, created_by)
  values (v_user_id, encode(digest(v_raw_token, 'sha256'), 'hex'), now() + interval '30 minutes', auth.uid());

  perform public.fn_log_audit('password_reset.request', 'users', v_user_id);

  return v_raw_token;   -- الواجهة تبني الرابط: https://.../reset?token=<v_raw_token>
end;
$$;

grant execute on function public.request_password_reset(text) to authenticated;


create or replace function public.confirm_password_reset(p_token text, p_new_password text)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_token_hash text;
  v_user_id    uuid;
begin
  if length(p_new_password) < 8 then
    raise exception 'كلمة المرور يجب ألا تقل عن 8 أحرف';
  end if;

  v_token_hash := encode(digest(p_token, 'sha256'), 'hex');

  select user_id into v_user_id
  from public.password_reset_tokens
  where token_hash = v_token_hash and used_at is null and expires_at > now();

  if v_user_id is null then
    raise exception 'الرابط غير صالح أو منتهي الصلاحية';
  end if;

  -- تحديث كلمة المرور داخل auth.users بنفس آلية تشفير Supabase (bcrypt)
  update auth.users
  set encrypted_password = crypt(p_new_password, gen_salt('bf'))
  where id = v_user_id;

  update public.password_reset_tokens set used_at = now() where token_hash = v_token_hash;

  perform public.fn_log_audit('password_reset.confirm', 'users', v_user_id);
end;
$$;

-- ملاحظة: هذه الدالة تُستدعى قبل تسجيل الدخول (العميل ليس لديه جلسة بعد)
-- لذلك يجب كشفها كـ Edge Function عامة (anon) وليس عبر RLS/auth.uid()
-- العادية، مع التحقق من الرمز نفسه كبديل كامل عن الهوية.
grant execute on function public.confirm_password_reset(text, text) to anon, authenticated;
