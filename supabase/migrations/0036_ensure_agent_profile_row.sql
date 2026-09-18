-- =====================================================================
-- 0036_ensure_agent_profile_row.sql
-- المشكلة الجذرية: مفيش أي مكان في المشروع كان بينشئ صف في agent_profiles
-- لما حساب يتحول لمندوب (delivery_agent) — الترقية من RoleSelect كانت
-- بتعمل UPDATE على عمود role بس، من غير ما تنشئ الصف المرتبط. النتيجة:
-- أي تحديث لحالة التوفر بيروح لصف مش موجود (ينفّذ بنجاح لكن بلا تأثير)،
-- وfn_pick_agent مستحيل يلاقي المندوب ده "متاح" لأنه معندوش صف يتفحصه أصلاً.
-- =====================================================================

-- تصحيح فوري لأي حساب مندوب حالي ناقصه الصف ده
insert into public.agent_profiles (user_id)
select id from public.users where role = 'delivery_agent'
on conflict (user_id) do nothing;

-- ومنعًا لتكرار المشكلة مستقبلًا: أي حساب يتحول لمندوب (سواء عند الإنشاء
-- المباشر أو الترقية من لوحة السوبر أدمن) بيتعمله الصف تلقائيًا
create or replace function public.fn_ensure_agent_profile()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.role = 'delivery_agent' then
    insert into public.agent_profiles (user_id)
    values (new.id)
    on conflict (user_id) do nothing;
  elsif old.role is not null and old.role = 'delivery_agent' and new.role <> 'delivery_agent' then
    -- لو اتنقل لدور تاني، يبقى غير متاح للتعيين التلقائي على طول
    update public.agent_profiles set availability_status = 'offline' where user_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_ensure_agent_profile on public.users;
create trigger trg_ensure_agent_profile
  after insert or update of role on public.users
  for each row execute function public.fn_ensure_agent_profile();
