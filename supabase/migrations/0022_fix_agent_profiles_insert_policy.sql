-- =====================================================================
-- 0022_fix_agent_profiles_insert_policy.sql
-- عند ترقية Super Admin لمستخدم إلى delivery_agent من شاشة إدارة
-- المستخدمين، يحتاج النظام لإنشاء صف agent_profiles جديد له —
-- كانت هذه العملية بدون سياسة INSERT صريحة فتُرفض افتراضيًا.
-- =====================================================================

create policy agent_profile_admin_insert on public.agent_profiles
  for insert with check (public.is_admin());
