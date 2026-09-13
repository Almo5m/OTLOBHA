-- =====================================================================
-- 0021_seed_whatsapp_templates.sql
-- قوالب الرسائل الجاهزة (قابلة للتعديل لاحقًا من لوحة التحكم)
-- =====================================================================

insert into public.whatsapp_templates (event_key, body_text) values
  ('order_accepted', 'أهلاً {{customer_name}}، تم قبول طلبك رقم {{order_number}} وجارٍ تجهيزه الآن. شكرًا لطلبك من اطلبها 🌿'),
  ('order_rejected', 'أهلاً {{customer_name}}، نعتذر، تم رفض طلبك رقم {{order_number}}. السبب: {{rejection_reason}}'),
  ('invoice_ready', 'أهلاً {{customer_name}}، فاتورة طلبك رقم {{order_number}} جاهزة والإجمالي {{grand_total}} جنيه. الطلب في طريقه للتجهيز للتوصيل.'),
  ('on_the_way', 'أهلاً {{customer_name}}، المندوب في الطريق إليك الآن لتوصيل طلبك رقم {{order_number}}. برجاء تجهيز المبلغ المطلوب.'),
  ('delivered', 'أهلاً {{customer_name}}، تم تسليم طلبك رقم {{order_number}} بنجاح. شكرًا لثقتك في اطلبها، ويسعدنا تقييم تجربتك 🌟'),
  ('order_canceled', 'أهلاً {{customer_name}}، تم إلغاء طلبك رقم {{order_number}}. السبب: {{cancellation_reason}}'),
  ('debt_notice', 'أهلاً {{customer_name}}، تم تسجيل مديونية بقيمة {{grand_total}} جنيه على حسابك، وستُضاف تلقائيًا لطلبك القادم.'),
  ('password_reset', 'أهلاً {{customer_name}}، اضغط على الرابط التالي لإعادة تعيين كلمة المرور الخاصة بحسابك في اطلبها (صالح لمدة 30 دقيقة فقط).')
on conflict (event_key) do nothing;
