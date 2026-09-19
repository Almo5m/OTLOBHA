-- =====================================================================
-- 0042_fix_pgcrypto_search_path.sql
-- السبب: على Supabase، إضافة pgcrypto بتتركّب في schema اسمه extensions
-- مش public، لكن الدوال دي كانت محددة search_path = public بس، فأي دالة
-- من pgcrypto (gen_random_bytes, digest, crypt, gen_salt) بتفشل بـ
-- "function ... does not exist" رغم إن الإكستينشن مفعّل فعليًا.
-- =====================================================================

create or replace function public.request_password_reset(p_customer_phone text)
returns text
language plpgsql security definer set search_path = public, extensions
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

  return v_raw_token;
end;
$$;

grant execute on function public.request_password_reset(text) to authenticated;

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

  v_token_hash := encode(digest(p_token, 'sha256'), 'hex');

  select user_id into v_user_id
  from public.password_reset_tokens
  where token_hash = v_token_hash and used_at is null and expires_at > now();

  if v_user_id is null then
    raise exception 'الرابط غير صالح أو منتهي الصلاحية';
  end if;

  update auth.users
  set encrypted_password = crypt(p_new_password, gen_salt('bf'))
  where id = v_user_id;

  update public.password_reset_tokens set used_at = now() where token_hash = v_token_hash;

  perform public.fn_log_audit('password_reset.confirm', 'users', v_user_id);
end;
$$;

grant execute on function public.confirm_password_reset(text, text) to anon, authenticated;
