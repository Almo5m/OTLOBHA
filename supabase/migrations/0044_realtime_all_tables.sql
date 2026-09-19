-- =====================================================================
-- 0044_realtime_all_tables.sql
-- توسيع Realtime ليشمل كل الجداول المهمة عشان أي تعديل (منتج جديد، تغيير
-- حالة طلب، شكوى جديدة...) يظهر فورًا لكل من يشاهد الصفحة المرتبطة، من
-- غير ما يحتاج يعمل Refresh يدوي — بدل جدول الطلبات بس زي ما كان قبل كده.
-- =====================================================================

alter publication supabase_realtime add table public.products;
alter publication supabase_realtime add table public.categories;
alter publication supabase_realtime add table public.product_subcategories;
alter publication supabase_realtime add table public.order_items;
alter publication supabase_realtime add table public.invoices;
alter publication supabase_realtime add table public.users;
alter publication supabase_realtime add table public.agent_profiles;
alter publication supabase_realtime add table public.complaints;
alter publication supabase_realtime add table public.customer_discounts;
alter publication supabase_realtime add table public.promotions;
alter publication supabase_realtime add table public.debts;
alter publication supabase_realtime add table public.commission_ledger;
alter publication supabase_realtime add table public.payment_proofs;
