-- =====================================================================
-- seed.sql — البيانات الافتراضية الأساسية فقط (تصنيفات، وحدات بيع،
-- قوالب واتساب، إعدادات المنصة). آمن للتشغيل أكتر من مرة (لو الصف
-- موجود، بيتخطاه ومش بيغيّر أي قيمة عدّلتها من لوحة التحكم).
-- شغّله بعد schema.sql.
-- =====================================================================

set search_path = public, extensions;

INSERT INTO public.categories (id, name, image_url, description, is_active, sort_order, created_at, updated_at) VALUES ('8aec1393-2ebb-4a8d-ab21-0dab7bd7c90e', 'منتجات السوق', NULL, NULL, true, 1, '2026-09-19 19:47:41.782832+00', '2026-09-19 19:47:41.782832+00') ON CONFLICT DO NOTHING;
INSERT INTO public.categories (id, name, image_url, description, is_active, sort_order, created_at, updated_at) VALUES ('d64247f6-fff9-4a30-a064-6989386b4ffb', 'منتجات التنظيف', NULL, NULL, true, 2, '2026-09-19 19:47:41.782832+00', '2026-09-19 19:47:41.782832+00') ON CONFLICT DO NOTHING;
INSERT INTO public.categories (id, name, image_url, description, is_active, sort_order, created_at, updated_at) VALUES ('47d6b20d-880e-4c46-8651-b2dcc2b3359c', 'المنتجات الطبية', NULL, NULL, true, 3, '2026-09-19 19:47:41.782832+00', '2026-09-19 19:47:41.782832+00') ON CONFLICT DO NOTHING;
INSERT INTO public.categories (id, name, image_url, description, is_active, sort_order, created_at, updated_at) VALUES ('4071ffe6-70e3-4f9c-8e6e-8d6041441d15', 'الخضروات', NULL, NULL, true, 4, '2026-09-19 19:47:41.782832+00', '2026-09-19 19:47:41.782832+00') ON CONFLICT DO NOTHING;
INSERT INTO public.platform_settings (key, value, updated_by, updated_at) VALUES ('delivery_fee', '0', NULL, '2026-09-19 19:47:41.779205+00') ON CONFLICT DO NOTHING;
INSERT INTO public.platform_settings (key, value, updated_by, updated_at) VALUES ('commission_rate', '0', NULL, '2026-09-19 19:47:41.779205+00') ON CONFLICT DO NOTHING;
INSERT INTO public.platform_settings (key, value, updated_by, updated_at) VALUES ('cancellation_debt_value', '0', NULL, '2026-09-19 19:47:41.779205+00') ON CONFLICT DO NOTHING;
INSERT INTO public.platform_settings (key, value, updated_by, updated_at) VALUES ('cancellation_debt_is_percentage', 'false', NULL, '2026-09-19 19:47:41.779205+00') ON CONFLICT DO NOTHING;
INSERT INTO public.platform_settings (key, value, updated_by, updated_at) VALUES ('service_area_label', '"المنيب – مصر"', NULL, '2026-09-19 19:47:41.779205+00') ON CONFLICT DO NOTHING;
INSERT INTO public.platform_settings (key, value, updated_by, updated_at) VALUES ('price_disclaimer_text', '"تنبيه: أسعار المنتجات قابلة للتغيير، والسعر النهائي للمنتج هو السعر الفعلي وقت الشراء. السعر الظاهر على الموقع هو آخر سعر مسجل لدينا وقد يختلف عن السعر النهائي."', NULL, '2026-09-19 19:47:41.779205+00') ON CONFLICT DO NOTHING;
INSERT INTO public.platform_settings (key, value, updated_by, updated_at) VALUES ('outside_working_hours_message', '"الخدمة متوقفة حاليًا خارج ساعات العمل، نراكم قريبًا!"', NULL, '2026-09-19 19:47:41.779205+00') ON CONFLICT DO NOTHING;
INSERT INTO public.platform_settings (key, value, updated_by, updated_at) VALUES ('maintenance_message', '"الخدمة متوقفة مؤقتًا للصيانة، نعتذر عن الإزعاج."', NULL, '2026-09-19 19:47:41.779205+00') ON CONFLICT DO NOTHING;
INSERT INTO public.platform_settings (key, value, updated_by, updated_at) VALUES ('working_hours', '{"end": "23:00", "days": ["sat", "sun", "mon", "tue", "wed", "thu", "fri"], "start": "09:00"}', NULL, '2026-09-19 19:47:41.779205+00') ON CONFLICT DO NOTHING;
INSERT INTO public.platform_settings (key, value, updated_by, updated_at) VALUES ('platform_mode', '"normal"', NULL, '2026-09-19 19:47:41.779205+00') ON CONFLICT DO NOTHING;
INSERT INTO public.platform_settings (key, value, updated_by, updated_at) VALUES ('payment_wallet_details', '{"name": "", "number": ""}', NULL, '2026-09-19 19:47:42.303342+00') ON CONFLICT DO NOTHING;
INSERT INTO public.platform_settings (key, value, updated_by, updated_at) VALUES ('payment_instapay_details', '{"name": "", "handle": ""}', NULL, '2026-09-19 19:47:42.303342+00') ON CONFLICT DO NOTHING;
INSERT INTO public.platform_settings (key, value, updated_by, updated_at) VALUES ('home_banner_image_url', '""', NULL, '2026-09-19 19:47:42.339287+00') ON CONFLICT DO NOTHING;
INSERT INTO public.platform_settings (key, value, updated_by, updated_at) VALUES ('announcement_bar_enabled', 'false', NULL, '2026-09-19 19:47:42.339287+00') ON CONFLICT DO NOTHING;
INSERT INTO public.platform_settings (key, value, updated_by, updated_at) VALUES ('announcement_bar_text', '""', NULL, '2026-09-19 19:47:42.339287+00') ON CONFLICT DO NOTHING;
INSERT INTO public.platform_settings (key, value, updated_by, updated_at) VALUES ('app_logo_url', '""', NULL, '2026-09-19 19:47:42.528769+00') ON CONFLICT DO NOTHING;
INSERT INTO public.platform_settings (key, value, updated_by, updated_at) VALUES ('support_whatsapp_number', '""', NULL, '2026-09-19 19:47:42.562773+00') ON CONFLICT DO NOTHING;
INSERT INTO public.platform_settings (key, value, updated_by, updated_at) VALUES ('home_hero_image_url', '""', NULL, '2026-09-22 08:32:49.552953+00') ON CONFLICT DO NOTHING;
INSERT INTO public.platform_settings (key, value, updated_by, updated_at) VALUES ('categories_visible', 'true', NULL, '2026-09-22 08:32:49.694734+00') ON CONFLICT DO NOTHING;
INSERT INTO public.platform_settings (key, value, updated_by, updated_at) VALUES ('free_order_card_image_url', '""', NULL, '2026-09-22 08:32:49.694734+00') ON CONFLICT DO NOTHING;
INSERT INTO public.platform_settings (key, value, updated_by, updated_at) VALUES ('wallet_payment_enabled', 'true', NULL, '2026-09-24 22:32:17.851883+00') ON CONFLICT DO NOTHING;
INSERT INTO public.platform_settings (key, value, updated_by, updated_at) VALUES ('instapay_payment_enabled', 'true', NULL, '2026-09-24 22:32:17.851883+00') ON CONFLICT DO NOTHING;
INSERT INTO public.sale_units (id, name, created_at) VALUES ('6d8db009-7170-4fd8-9a03-ca206b980804', 'قطعة', '2026-09-19 19:47:41.782361+00') ON CONFLICT DO NOTHING;
INSERT INTO public.sale_units (id, name, created_at) VALUES ('9bb36185-2a91-4293-9218-2f2c1dd13d35', 'كيلو', '2026-09-19 19:47:41.782361+00') ON CONFLICT DO NOTHING;
INSERT INTO public.sale_units (id, name, created_at) VALUES ('d607283c-0abb-4eb6-a606-5fc1ce0cfc54', 'جرام', '2026-09-19 19:47:41.782361+00') ON CONFLICT DO NOTHING;
INSERT INTO public.sale_units (id, name, created_at) VALUES ('e361d00a-425e-406f-8ebb-38c081e66dfa', 'لتر', '2026-09-19 19:47:41.782361+00') ON CONFLICT DO NOTHING;
INSERT INTO public.sale_units (id, name, created_at) VALUES ('f3f3b5f5-af3e-4ffe-af21-0a623948a7b5', 'عبوة', '2026-09-19 19:47:41.782361+00') ON CONFLICT DO NOTHING;
INSERT INTO public.whatsapp_templates (id, event_key, body_text, is_active, updated_by, updated_at) VALUES ('d41d7c49-ac45-4b65-8c5c-850f73a72371', 'order_accepted', 'أهلاً {{customer_name}}، تم قبول طلبك رقم {{order_number}} وجارٍ تجهيزه الآن. شكرًا لطلبك من اطلبها 🌿', true, NULL, '2026-09-19 19:47:42.162461+00') ON CONFLICT DO NOTHING;
INSERT INTO public.whatsapp_templates (id, event_key, body_text, is_active, updated_by, updated_at) VALUES ('a6a3d3d8-4dc8-467f-8901-adad8b54b60f', 'order_rejected', 'أهلاً {{customer_name}}، نعتذر، تم رفض طلبك رقم {{order_number}}. السبب: {{rejection_reason}}', true, NULL, '2026-09-19 19:47:42.162461+00') ON CONFLICT DO NOTHING;
INSERT INTO public.whatsapp_templates (id, event_key, body_text, is_active, updated_by, updated_at) VALUES ('a50f8f88-4939-45af-aec6-8f20e71ef39a', 'invoice_ready', 'أهلاً {{customer_name}}، فاتورة طلبك رقم {{order_number}} جاهزة والإجمالي {{grand_total}} جنيه. الطلب في طريقه للتجهيز للتوصيل.', true, NULL, '2026-09-19 19:47:42.162461+00') ON CONFLICT DO NOTHING;
INSERT INTO public.whatsapp_templates (id, event_key, body_text, is_active, updated_by, updated_at) VALUES ('e4de5138-4893-4e29-be19-08568b9799c0', 'on_the_way', 'أهلاً {{customer_name}}، المندوب في الطريق إليك الآن لتوصيل طلبك رقم {{order_number}}. برجاء تجهيز المبلغ المطلوب.', true, NULL, '2026-09-19 19:47:42.162461+00') ON CONFLICT DO NOTHING;
INSERT INTO public.whatsapp_templates (id, event_key, body_text, is_active, updated_by, updated_at) VALUES ('fd0d5957-4b2f-426c-a566-eb3d201066f1', 'delivered', 'أهلاً {{customer_name}}، تم تسليم طلبك رقم {{order_number}} بنجاح. شكرًا لثقتك في اطلبها، ويسعدنا تقييم تجربتك 🌟', true, NULL, '2026-09-19 19:47:42.162461+00') ON CONFLICT DO NOTHING;
INSERT INTO public.whatsapp_templates (id, event_key, body_text, is_active, updated_by, updated_at) VALUES ('4d688d62-3e57-422e-8a87-08984c656b56', 'order_canceled', 'أهلاً {{customer_name}}، تم إلغاء طلبك رقم {{order_number}}. السبب: {{cancellation_reason}}', true, NULL, '2026-09-19 19:47:42.162461+00') ON CONFLICT DO NOTHING;
INSERT INTO public.whatsapp_templates (id, event_key, body_text, is_active, updated_by, updated_at) VALUES ('074fc813-3694-43af-a914-ce1a1e3d2dd6', 'debt_notice', 'أهلاً {{customer_name}}، تم تسجيل مديونية بقيمة {{grand_total}} جنيه على حسابك، وستُضاف تلقائيًا لطلبك القادم.', true, NULL, '2026-09-19 19:47:42.162461+00') ON CONFLICT DO NOTHING;
INSERT INTO public.whatsapp_templates (id, event_key, body_text, is_active, updated_by, updated_at) VALUES ('66ff7ac9-8e2e-49d7-b39b-96ec378ec382', 'password_reset', 'أهلاً {{customer_name}}، اضغط على الرابط التالي لإعادة تعيين كلمة المرور الخاصة بحسابك في اطلبها (صالح لمدة 30 دقيقة فقط).', true, NULL, '2026-09-19 19:47:42.162461+00') ON CONFLICT DO NOTHING;
