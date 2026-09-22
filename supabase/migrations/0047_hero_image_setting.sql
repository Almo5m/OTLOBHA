-- =====================================================================
-- 0047_hero_image_setting.sql
-- صورة الرسمة التوضيحية جوه الهيرو (منفصلة عن البانر) — قابلة للرفع من
-- لوحة التحكم، وترجع للرسمة الافتراضية (HeroIllustration) لو مفيش صورة
-- =====================================================================

insert into public.platform_settings (key, value) values
  ('home_hero_image_url', '""'::jsonb)
on conflict (key) do nothing;
