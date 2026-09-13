-- =====================================================================
-- 0007_indexes.sql
-- =====================================================================

create index idx_orders_customer_status on public.orders (customer_id, status);
create index idx_orders_agent_status    on public.orders (assigned_agent_id, status);
create index idx_orders_status          on public.orders (status);

create index idx_order_items_order      on public.order_items (order_id);
create index idx_invoice_items_invoice  on public.invoice_items (invoice_id);

create index idx_debts_customer_status  on public.debts (customer_id, status);

create index idx_audit_entity           on public.audit_log (entity_type, entity_id);
create index idx_audit_created_at       on public.audit_log (created_at desc);
create index idx_audit_actor            on public.audit_log (actor_id);

create index idx_price_history_product  on public.product_price_history (product_id, recorded_at desc);

create index idx_products_category      on public.products (category_id) where status = 'active';

create index idx_addresses_customer     on public.addresses (customer_id);

create index idx_complaints_customer    on public.complaints (customer_id);
create index idx_complaints_status      on public.complaints (status);

create index idx_commission_status      on public.commission_ledger (status);

create index idx_notification_recipient on public.notification_log (recipient_id, created_at desc);

create index idx_sessions_user          on public.user_sessions (user_id) where revoked_at is null;
