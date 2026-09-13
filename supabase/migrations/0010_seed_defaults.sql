-- =====================================================================
-- 0010_seed_defaults.sql
-- القيم الافتراضية المتفق عليها: صفر لكل القيم المالية القابلة للتعديل
-- =====================================================================

insert into public.platform_settings (key, value) values
  ('delivery_fee',              '0'::jsonb),
  ('commission_rate',           '0'::jsonb),   -- نسبة، مثال مستقبلي: 0.10
  ('cancellation_debt_value',   '0'::jsonb),
  ('cancellation_debt_is_percentage', 'false'::jsonb),
  ('service_area_label',        '"المنيب – مصر"'::jsonb),
  ('price_disclaimer_text',
    '"تنبيه: أسعار المنتجات قابلة للتغيير، والسعر النهائي للمنتج هو السعر الفعلي وقت الشراء. السعر الظاهر على الموقع هو آخر سعر مسجل لدينا وقد يختلف عن السعر النهائي."'::jsonb),
  ('outside_working_hours_message',
    '"الخدمة متوقفة حاليًا خارج ساعات العمل، نراكم قريبًا!"'::jsonb),
  ('maintenance_message',
    '"الخدمة متوقفة مؤقتًا للصيانة، نعتذر عن الإزعاج."'::jsonb),
  ('working_hours',
    '{"start":"09:00","end":"23:00","days":["sat","sun","mon","tue","wed","thu","fri"]}'::jsonb),
  ('platform_mode', '"normal"'::jsonb)   -- normal | paused_new_orders | maintenance
on conflict (key) do nothing;

insert into public.sale_units (name) values
  ('قطعة'), ('كيلو'), ('جرام'), ('لتر'), ('عبوة')
on conflict (name) do nothing;

insert into public.categories (name, description, sort_order) values
  ('منتجات السوق', null, 1),
  ('منتجات التنظيف', null, 2),
  ('المنتجات الطبية', null, 3),
  ('الخضروات', null, 4);
