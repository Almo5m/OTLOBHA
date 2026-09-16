-- =====================================================================
-- 0026_banner_and_announcement_settings.sql
-- =====================================================================

insert into public.platform_settings (key, value) values
  ('home_banner_image_url', '""'::jsonb),
  ('announcement_bar_enabled', 'false'::jsonb),
  ('announcement_bar_text', '""'::jsonb)
on conflict (key) do nothing;
