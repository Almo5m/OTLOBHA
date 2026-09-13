-- =====================================================================
-- 0009_rls_policies.sql
-- Deny by default على كل الجداول، ثم إضافة سياسات صريحة فقط
-- =====================================================================

-- تفعيل RLS على كل الجداول (بدون استثناء)
alter table public.users                    enable row level security;
alter table public.customer_profiles        enable row level security;
alter table public.agent_profiles           enable row level security;
alter table public.addresses                enable row level security;
alter table public.categories               enable row level security;
alter table public.sale_units               enable row level security;
alter table public.products                 enable row level security;
alter table public.product_price_history    enable row level security;
alter table public.orders                   enable row level security;
alter table public.order_items              enable row level security;
alter table public.order_transfers          enable row level security;
alter table public.order_status_history     enable row level security;
alter table public.invoices                 enable row level security;
alter table public.invoice_items            enable row level security;
alter table public.platform_settings        enable row level security;
alter table public.debts                    enable row level security;
alter table public.debt_settlements         enable row level security;
alter table public.commission_ledger        enable row level security;
alter table public.commission_payments      enable row level security;
alter table public.ratings                  enable row level security;
alter table public.complaints               enable row level security;
alter table public.policies                 enable row level security;
alter table public.policy_consents          enable row level security;
alter table public.audit_log                enable row level security;
alter table public.user_sessions            enable row level security;
alter table public.password_reset_tokens    enable row level security;
alter table public.whatsapp_templates       enable row level security;
alter table public.notification_log         enable row level security;
alter table public.push_subscriptions       enable row level security;

-- ---------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------
create policy users_select_self on public.users
  for select using (id = auth.uid() or public.is_admin());

create policy users_select_agent_by_admin on public.users
  for select using (public.is_admin());   -- مغطاة أعلاه فعليًا، موضوعة للوضوح

create policy users_update_self_limited on public.users
  for update using (id = auth.uid())
  with check (id = auth.uid() and role = (select role from public.users u2 where u2.id = auth.uid()));
  -- المستخدم يعدّل بياناته لكن لا يستطيع تغيير دوره بنفسه

create policy users_admin_full_access on public.users
  for all using (public.is_super_admin())
  with check (public.is_super_admin());

-- Business Admin يستطيع حظر/إلغاء حظر العميل فقط (القسم 47) — وليس تعديل
-- الدور أو أي بيانات إدارية أخرى، ولا التأثير على أي حساب إداري آخر
create policy business_admin_block_customer on public.users
  for update using (public.is_business_admin() and role = 'customer')
  with check (public.is_business_admin() and role = 'customer');

-- ---------------------------------------------------------------------
-- customer_profiles / agent_profiles
-- ---------------------------------------------------------------------
create policy customer_profile_owner on public.customer_profiles
  for select using (user_id = auth.uid() or public.is_admin());

create policy customer_profile_owner_update on public.customer_profiles
  for update using (user_id = auth.uid() or public.is_admin());

create policy agent_profile_owner on public.agent_profiles
  for select using (user_id = auth.uid() or public.is_admin());

create policy agent_profile_owner_update on public.agent_profiles
  for update using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------
-- addresses — العميل يرى ويدير عناوينه فقط
-- ---------------------------------------------------------------------
create policy addresses_owner_all on public.addresses
  for all using (customer_id = auth.uid() or public.is_admin())
  with check (customer_id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------
-- الكتالوج: قراءة عامة لكل مستخدم مسجّل، كتابة لـ Super Admin فقط (تصنيفات)
-- ووحدات البيع كذلك، أما المنتجات فبحسب صلاحيات Business Admin أيضًا
-- ---------------------------------------------------------------------
create policy categories_read_all on public.categories
  for select using (true);   -- التصفح متاح حتى قبل تسجيل الدخول عبر anon key للقراءة فقط

create policy categories_write_super_admin on public.categories
  for insert with check (public.is_super_admin());
create policy categories_update_super_admin on public.categories
  for update using (public.is_super_admin());
create policy categories_delete_super_admin on public.categories
  for delete using (public.is_super_admin());

create policy sale_units_read_all on public.sale_units
  for select using (true);
create policy sale_units_write_super_admin on public.sale_units
  for insert with check (public.is_super_admin());
create policy sale_units_update_super_admin on public.sale_units
  for update using (public.is_super_admin());

create policy products_read_all on public.products
  for select using (true);
create policy products_write_admin on public.products
  for insert with check (public.is_admin());
create policy products_update_admin on public.products
  for update using (public.is_admin());

create policy price_history_read_admin_agent on public.product_price_history
  for select using (public.is_admin() or public.is_agent());
-- لا INSERT مباشر من الواجهة: يُضاف فقط عبر RPC عند اعتماد الفاتورة (مرحلة لاحقة)

-- ---------------------------------------------------------------------
-- orders — القلب الأمني للمشروع
-- ---------------------------------------------------------------------
create policy orders_select_customer on public.orders
  for select using (customer_id = auth.uid());

create policy orders_select_agent on public.orders
  for select using (
    assigned_agent_id = auth.uid()
    and status in ('shopping','invoice_preparation','invoice_approved','ready_for_delivery','assigned','on_the_way','delivered')
    -- المندوب يرى الطلب من لحظة تكليفه بالشراء وحتى اكتمال التوصيل،
    -- لكن ليس أثناء المراجعة/القبول قبل أن يُختار أصلاً
  );

create policy orders_select_admin on public.orders
  for select using (public.is_admin());

create policy orders_insert_customer on public.orders
  for insert with check (customer_id = auth.uid());
  -- لا يوجد INSERT لأي دور آخر؛ إنشاء الطلب حصري للعميل

-- لا توجد سياسة UPDATE عامة: كل انتقال حالة يتم فقط عبر RPC بصلاحية
-- SECURITY DEFINER في مراحل لاحقة (State Machine)، لمنع تعديل الحالة
-- مباشرة عبر REST API حتى لو امتلك المستخدم صلاحية SELECT/UPDATE نظرية.

-- ---------------------------------------------------------------------
-- order_items
-- ---------------------------------------------------------------------
create policy order_items_select_customer on public.order_items
  for select using (
    exists (select 1 from public.orders o where o.id = order_id and o.customer_id = auth.uid())
  );

create policy order_items_select_agent on public.order_items
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = order_id and o.assigned_agent_id = auth.uid()
        and o.status in ('shopping','invoice_preparation','assigned','on_the_way','delivered')
    )
  );

create policy order_items_select_admin on public.order_items
  for select using (public.is_admin());

create policy order_items_insert_customer on public.order_items
  for insert with check (
    exists (
      select 1 from public.orders o
      where o.id = order_id and o.customer_id = auth.uid() and o.status in ('new_order','review')
    )
  );
  -- الإضافة/التعديل مسموح فقط قبل تأكيد الطلب (قاعدة القسم 20)

create policy order_items_update_before_confirm on public.order_items
  for update using (
    exists (
      select 1 from public.orders o
      where o.id = order_id and o.customer_id = auth.uid() and o.status in ('new_order','review')
    )
  );

create policy order_items_update_actual_price on public.order_items
  for update using (
    public.is_admin()
    or (
      public.is_agent()
      and exists (
        select 1 from public.orders o
        where o.id = order_id and o.assigned_agent_id = auth.uid() and o.status = 'shopping'
      )
    )
  );
  -- تسجيل السعر الفعلي/عدم التوفر: للمندوب المُسند فقط أثناء الشراء، أو أي إداري

-- ---------------------------------------------------------------------
-- order_transfers / order_status_history — Super Admin فقط للقراءة المباشرة
-- ---------------------------------------------------------------------
create policy order_transfers_super_admin_only on public.order_transfers
  for select using (public.is_super_admin());

create policy order_status_history_admin on public.order_status_history
  for select using (public.is_admin());

create policy order_status_history_customer on public.order_status_history
  for select using (
    exists (select 1 from public.orders o where o.id = order_id and o.customer_id = auth.uid())
  );

-- ---------------------------------------------------------------------
-- invoices / invoice_items
-- ---------------------------------------------------------------------
create policy invoices_select_customer on public.invoices
  for select using (
    exists (select 1 from public.orders o where o.id = order_id and o.customer_id = auth.uid())
  );
create policy invoices_select_admin on public.invoices
  for select using (public.is_admin());
create policy invoices_select_agent on public.invoices
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = order_id and o.assigned_agent_id = auth.uid()
    )
  );
-- الكتابة (draft/approve/cancel) عبر RPC فقط في المرحلة القادمة — لا INSERT/UPDATE مباشر

create policy invoice_items_select_customer on public.invoice_items
  for select using (
    exists (
      select 1 from public.invoices i
      join public.orders o on o.id = i.order_id
      where i.id = invoice_id and o.customer_id = auth.uid()
    )
  );
create policy invoice_items_select_admin on public.invoice_items
  for select using (public.is_admin());

-- ---------------------------------------------------------------------
-- platform_settings — قراءة عامة (بعض القيم تخص واجهة العميل مثل رسوم
-- التوصيل ونص التنبيه)، كتابة لـ Super Admin فقط
-- ---------------------------------------------------------------------
create policy settings_read_all on public.platform_settings
  for select using (true);
create policy settings_write_super_admin on public.platform_settings
  for insert with check (public.is_super_admin());
create policy settings_update_super_admin on public.platform_settings
  for update using (public.is_super_admin());

-- ---------------------------------------------------------------------
-- debts / debt_settlements — لا كتابة مباشرة، فقط عبر RPC مالية محمية
-- ---------------------------------------------------------------------
create policy debts_select_customer on public.debts
  for select using (customer_id = auth.uid());
create policy debts_select_admin on public.debts
  for select using (public.is_admin());

create policy debt_settlements_select_admin on public.debt_settlements
  for select using (public.is_admin());
create policy debt_settlements_select_customer on public.debt_settlements
  for select using (
    exists (select 1 from public.debts d where d.id = debt_id and d.customer_id = auth.uid())
  );

-- ---------------------------------------------------------------------
-- commission_ledger / commission_payments — Super Admin فقط (والعمولة
-- تخص مالك المنصة حصرًا؛ Business Admin يرى فقط "الإجمالي المستحق" عبر
-- View مُلخَّصة تُبنى لاحقًا، وليس السجل التفصيلي الكامل)
-- ---------------------------------------------------------------------
create policy commission_ledger_super_admin on public.commission_ledger
  for select using (public.is_super_admin());
create policy commission_payments_super_admin on public.commission_payments
  for select using (public.is_super_admin());

-- ---------------------------------------------------------------------
-- ratings
-- ---------------------------------------------------------------------
create policy ratings_select_admin on public.ratings
  for select using (public.is_admin());
create policy ratings_select_own on public.ratings
  for select using (customer_id = auth.uid() or agent_id = auth.uid());
create policy ratings_insert_customer on public.ratings
  for insert with check (
    customer_id = auth.uid()
    and exists (select 1 from public.orders o where o.id = order_id and o.status = 'delivered')
  );

-- ---------------------------------------------------------------------
-- complaints
-- ---------------------------------------------------------------------
create policy complaints_select_own on public.complaints
  for select using (customer_id = auth.uid() or agent_id = auth.uid());
create policy complaints_select_admin on public.complaints
  for select using (public.is_admin());
create policy complaints_insert_customer on public.complaints
  for insert with check (
    customer_id = auth.uid()
    and (order_id is null or exists (
      select 1 from public.orders o where o.id = order_id and o.status = 'delivered'
    ))
  );
create policy complaints_update_admin on public.complaints
  for update using (public.is_admin());

-- ---------------------------------------------------------------------
-- policies / policy_consents
-- ---------------------------------------------------------------------
create policy policies_read_all on public.policies
  for select using (true);
create policy policies_write_super_admin on public.policies
  for insert with check (public.is_super_admin());

create policy consents_select_own on public.policy_consents
  for select using (user_id = auth.uid() or public.is_admin());
create policy consents_insert_own on public.policy_consents
  for insert with check (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- audit_log — Super Admin قراءة فقط، لا UPDATE ولا DELETE لأي أحد إطلاقًا
-- ---------------------------------------------------------------------
create policy audit_log_select_super_admin on public.audit_log
  for select using (public.is_super_admin());
create policy audit_log_insert_system on public.audit_log
  for insert with check (true);
  -- الإدراج يتم فقط عبر Triggers/RPC بصلاحية SECURITY DEFINER من السيرفر،
  -- وليس مباشرة من العميل عبر REST (لا صلاحية insert تُمنح لأدوار المستخدمين في الواجهة)

-- ---------------------------------------------------------------------
-- user_sessions
-- ---------------------------------------------------------------------
create policy sessions_select_own on public.user_sessions
  for select using (user_id = auth.uid() or public.is_super_admin());
create policy sessions_update_super_admin on public.user_sessions
  for update using (public.is_super_admin());   -- لإنهاء الجلسات (revoked_at)

-- ---------------------------------------------------------------------
-- password_reset_tokens — لا قراءة لأي دور عبر الواجهة (يُستخدم فقط
-- عبر RPC آمن يتحقق من الـ token_hash مباشرة)
-- ---------------------------------------------------------------------
create policy reset_tokens_admin_create on public.password_reset_tokens
  for insert with check (public.is_admin());
create policy reset_tokens_admin_view on public.password_reset_tokens
  for select using (public.is_admin());

-- ---------------------------------------------------------------------
-- whatsapp_templates — قراءة للمندوب/الإداري (لتوليد النص)، كتابة لـ Super Admin
-- ---------------------------------------------------------------------
create policy templates_read_staff on public.whatsapp_templates
  for select using (public.is_admin() or public.is_agent());
create policy templates_write_super_admin on public.whatsapp_templates
  for all using (public.is_super_admin()) with check (public.is_super_admin());

-- ---------------------------------------------------------------------
-- notification_log
-- ---------------------------------------------------------------------
create policy notification_log_select_admin on public.notification_log
  for select using (public.is_admin());
create policy notification_log_insert_staff on public.notification_log
  for insert with check (public.is_admin() or public.is_agent());

-- ---------------------------------------------------------------------
-- push_subscriptions — كل مستخدم يدير اشتراكه الخاص فقط
-- ---------------------------------------------------------------------
create policy push_subs_owner on public.push_subscriptions
  for all using (user_id = auth.uid())
  with check (user_id = auth.uid());
