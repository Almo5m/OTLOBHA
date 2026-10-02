-- =====================================================================
-- schema.sql — تعريف قاعدة البيانات بالكامل (مُجمَّع من 52 migration)
-- آمن للتشغيل أكتر من مرة على نفس المشروع (كل عنصر بيتحقق من وجوده
-- الأول). شغّله كامل في SQL Editor على مشروع Supabase جديد فاضي.
-- =====================================================================

-- =====================================================================
-- 0) الإضافات (Extensions) ومسار البحث
-- =====================================================================

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists citext with schema extensions;
create extension if not exists pg_trgm with schema extensions;
set search_path = public, extensions;

-- أي دالة جديدة تتعمل بعد كده مش هتاخد صلاحية تنفيذ للزوار أو المستخدمين
-- تلقائيًا؛ كل دالة لازم تتمنح صلاحيتها صراحة في قسم الصلاحيات تحت.
alter default privileges for role postgres in schema public revoke execute on functions from public, anon, authenticated;
alter default privileges for role postgres revoke execute on functions from public;

-- =====================================================================
-- 1) الأنواع (Enums)
-- =====================================================================

do $mig$
begin
  CREATE TYPE public.agent_availability AS ENUM (
    'available',
    'busy',
    'offline'
);
exception
  when duplicate_object then null;
end
$mig$;

do $mig$
begin
  CREATE TYPE public.commission_status AS ENUM (
    'due',
    'paid'
);
exception
  when duplicate_object then null;
end
$mig$;

do $mig$
begin
  CREATE TYPE public.complaint_status AS ENUM (
    'new',
    'under_review',
    'resolved',
    'closed'
);
exception
  when duplicate_object then null;
end
$mig$;

do $mig$
begin
  CREATE TYPE public.debt_reason AS ENUM (
    'customer_cancellation',
    'uncontactable',
    'other'
);
exception
  when duplicate_object then null;
end
$mig$;

do $mig$
begin
  CREATE TYPE public.debt_status AS ENUM (
    'outstanding',
    'settled',
    'partially_settled'
);
exception
  when duplicate_object then null;
end
$mig$;

do $mig$
begin
  CREATE TYPE public.invoice_status AS ENUM (
    'draft',
    'approved',
    'canceled'
);
exception
  when duplicate_object then null;
end
$mig$;

do $mig$
begin
  CREATE TYPE public.notification_channel AS ENUM (
    'push',
    'whatsapp_manual'
);
exception
  when duplicate_object then null;
end
$mig$;

do $mig$
begin
  CREATE TYPE public.notification_status AS ENUM (
    'prepared',
    'sent',
    'failed'
);
exception
  when duplicate_object then null;
end
$mig$;

do $mig$
begin
  CREATE TYPE public.order_item_type AS ENUM (
    'catalog',
    'manual'
);
exception
  when duplicate_object then null;
end
$mig$;

do $mig$
begin
  CREATE TYPE public.order_status AS ENUM (
    'new_order',
    'review',
    'accepted',
    'rejected',
    'shopping',
    'invoice_preparation',
    'invoice_approved',
    'ready_for_delivery',
    'assigned',
    'on_the_way',
    'delivered',
    'canceled_by_customer',
    'canceled_by_business'
);
exception
  when duplicate_object then null;
end
$mig$;

do $mig$
begin
  CREATE TYPE public.payment_method AS ENUM (
    'cash',
    'wallet',
    'instapay'
);
exception
  when duplicate_object then null;
end
$mig$;

do $mig$
begin
  CREATE TYPE public.payment_proof_status AS ENUM (
    'pending',
    'verified',
    'rejected'
);
exception
  when duplicate_object then null;
end
$mig$;

do $mig$
begin
  CREATE TYPE public.payment_status AS ENUM (
    'unpaid',
    'paid'
);
exception
  when duplicate_object then null;
end
$mig$;

do $mig$
begin
  CREATE TYPE public.product_status AS ENUM (
    'active',
    'inactive'
);
exception
  when duplicate_object then null;
end
$mig$;

do $mig$
begin
  CREATE TYPE public.user_role AS ENUM (
    'super_admin',
    'business_admin',
    'delivery_agent',
    'customer'
);
exception
  when duplicate_object then null;
end
$mig$;

do $mig$
begin
  CREATE TYPE public.user_status AS ENUM (
    'active',
    'blocked',
    'suspended'
);
exception
  when duplicate_object then null;
end
$mig$;

-- =====================================================================
-- 2) المتتاليات (Sequences) — قبل الجداول لأن أعمدة زي رقم الفاتورة بتستخدمها كقيمة افتراضية
-- =====================================================================

CREATE SEQUENCE IF NOT EXISTS public.invoice_number_seq
    START WITH 1000
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE IF NOT EXISTS public.order_number_seq
    START WITH 1000
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

-- =====================================================================
-- 3) الجداول
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.addresses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_id uuid NOT NULL,
    label text,
    full_address_text text NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.agent_profiles (
    user_id uuid NOT NULL,
    availability_status public.agent_availability DEFAULT 'offline'::public.agent_availability NOT NULL,
    current_active_orders_count integer DEFAULT 0 NOT NULL,
    whatsapp_number text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.audit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    actor_id uuid,
    actor_role public.user_role,
    action text NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid,
    old_value jsonb,
    new_value jsonb,
    reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    image_url text,
    description text,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.commission_ledger (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    completed_at timestamp with time zone NOT NULL,
    delivery_fee_at_time numeric(12,2) NOT NULL,
    commission_rate_applied numeric(6,4) NOT NULL,
    commission_amount numeric(12,2) NOT NULL,
    status public.commission_status DEFAULT 'due'::public.commission_status NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.commission_payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    amount numeric(12,2) NOT NULL,
    period_from date,
    period_to date,
    paid_at timestamp with time zone DEFAULT now() NOT NULL,
    recorded_by uuid,
    notes text,
    CONSTRAINT commission_payments_amount_check CHECK ((amount > (0)::numeric))
);

CREATE TABLE IF NOT EXISTS public.complaints (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_id uuid NOT NULL,
    order_id uuid,
    agent_id uuid,
    type text NOT NULL,
    details text NOT NULL,
    status public.complaint_status DEFAULT 'new'::public.complaint_status NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    resolved_at timestamp with time zone,
    resolved_by uuid
);

CREATE TABLE IF NOT EXISTS public.customer_discounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_id uuid,
    discount_type text NOT NULL,
    value numeric(12,2) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone,
    CONSTRAINT customer_discounts_discount_type_check CHECK ((discount_type = ANY (ARRAY['percentage'::text, 'fixed'::text]))),
    CONSTRAINT customer_discounts_value_check CHECK ((value > (0)::numeric))
);

CREATE TABLE IF NOT EXISTS public.customer_profiles (
    user_id uuid NOT NULL,
    default_address_id uuid,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.debt_settlements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    debt_id uuid NOT NULL,
    amount_paid numeric(12,2) NOT NULL,
    settled_by uuid,
    settled_at timestamp with time zone DEFAULT now() NOT NULL,
    notes text,
    CONSTRAINT debt_settlements_amount_paid_check CHECK ((amount_paid > (0)::numeric))
);

CREATE TABLE IF NOT EXISTS public.debts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_id uuid NOT NULL,
    order_id uuid,
    amount numeric(12,2) NOT NULL,
    reason public.debt_reason NOT NULL,
    applied_rate_snapshot jsonb,
    status public.debt_status DEFAULT 'outstanding'::public.debt_status NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT debts_amount_check CHECK ((amount >= (0)::numeric))
);

CREATE TABLE IF NOT EXISTS public.invoice_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    invoice_id uuid NOT NULL,
    product_name text NOT NULL,
    quantity numeric(10,3) NOT NULL,
    unit_name text NOT NULL,
    actual_price numeric(12,2),
    line_total numeric(12,2) DEFAULT 0 NOT NULL,
    is_available boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    product_id uuid,
    order_item_id uuid
);

CREATE TABLE IF NOT EXISTS public.invoices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    invoice_number text DEFAULT ('INV-'::text || (nextval('public.invoice_number_seq'::regclass))::text) NOT NULL,
    order_id uuid NOT NULL,
    status public.invoice_status DEFAULT 'draft'::public.invoice_status NOT NULL,
    items_total numeric(12,2) DEFAULT 0 NOT NULL,
    delivery_fee numeric(12,2) DEFAULT 0 NOT NULL,
    previous_debt_included numeric(12,2) DEFAULT 0 NOT NULL,
    grand_total numeric(12,2) DEFAULT 0 NOT NULL,
    payment_method public.payment_method NOT NULL,
    payment_status public.payment_status DEFAULT 'unpaid'::public.payment_status NOT NULL,
    approved_by uuid,
    approved_at timestamp with time zone,
    canceled_reason text,
    canceled_by uuid,
    canceled_at timestamp with time zone,
    superseded_by_invoice_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.notification_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_key text NOT NULL,
    channel public.notification_channel NOT NULL,
    recipient_id uuid,
    status public.notification_status NOT NULL,
    payload jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.order_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    product_id uuid,
    item_type public.order_item_type NOT NULL,
    manual_name text,
    quantity numeric(10,3),
    unit_id uuid,
    customer_comment text,
    displayed_price_snapshot numeric(12,2),
    actual_price numeric(12,2),
    is_available boolean,
    unavailable_reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    manual_category_id uuid,
    manual_image_url text,
    converted_product_id uuid,
    dismissed_at timestamp with time zone,
    target_price numeric(12,2),
    CONSTRAINT chk_item_shape CHECK ((((item_type = 'catalog'::public.order_item_type) AND (product_id IS NOT NULL) AND (quantity IS NOT NULL) AND (quantity > (0)::numeric) AND (unit_id IS NOT NULL) AND (target_price IS NULL)) OR ((item_type = 'manual'::public.order_item_type) AND (manual_name IS NOT NULL) AND (((target_price IS NOT NULL) AND (quantity IS NULL) AND (unit_id IS NULL)) OR ((target_price IS NULL) AND (quantity IS NOT NULL) AND (quantity > (0)::numeric) AND (unit_id IS NOT NULL)))))),
    CONSTRAINT order_items_target_price_check CHECK (((target_price IS NULL) OR (target_price > (0)::numeric)))
);

CREATE TABLE IF NOT EXISTS public.order_status_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    from_status public.order_status,
    to_status public.order_status NOT NULL,
    changed_by uuid,
    reason text,
    changed_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.order_transfers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    from_agent_id uuid NOT NULL,
    to_agent_id uuid,
    reason text NOT NULL,
    transferred_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_number text DEFAULT ('ORD-'::text || (nextval('public.order_number_seq'::regclass))::text) NOT NULL,
    customer_id uuid NOT NULL,
    status public.order_status DEFAULT 'new_order'::public.order_status NOT NULL,
    delivery_address_snapshot jsonb NOT NULL,
    delivery_fee_applied numeric(12,2) DEFAULT 0 NOT NULL,
    previous_debt_applied numeric(12,2) DEFAULT 0 NOT NULL,
    payment_method public.payment_method NOT NULL,
    payment_status public.payment_status DEFAULT 'unpaid'::public.payment_status NOT NULL,
    assigned_agent_id uuid,
    policy_version_accepted text,
    policy_accepted_at timestamp with time zone,
    rejection_reason text,
    rejected_by uuid,
    rejected_at timestamp with time zone,
    cancellation_reason text,
    canceled_by uuid,
    canceled_at timestamp with time zone,
    accepted_at timestamp with time zone,
    delivered_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    delivery_fee_original numeric(12,2),
    applied_discount_id uuid,
    applied_promotion_id uuid
);

CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    token_hash text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    used_at timestamp with time zone,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.payment_proofs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    image_url text NOT NULL,
    sender_name text,
    sender_number text,
    status public.payment_proof_status DEFAULT 'pending'::public.payment_proof_status NOT NULL,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    notes text,
    submitted_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.platform_settings (
    key text NOT NULL,
    value jsonb NOT NULL,
    updated_by uuid,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.policies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    type text NOT NULL,
    version text NOT NULL,
    content text NOT NULL,
    published_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.policy_consents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    policy_id uuid NOT NULL,
    order_id uuid,
    consented_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.product_price_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    price numeric(12,2) NOT NULL,
    source_invoice_item_id uuid,
    recorded_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT product_price_history_price_check CHECK ((price >= (0)::numeric))
);

CREATE TABLE IF NOT EXISTS public.product_subcategories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    category_id uuid NOT NULL,
    name text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    category_id uuid NOT NULL,
    name text NOT NULL,
    image_url text,
    description text,
    sale_unit_id uuid NOT NULL,
    last_known_price numeric(12,2) DEFAULT 0 NOT NULL,
    status public.product_status DEFAULT 'active'::public.product_status NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    subcategory_id uuid,
    slug text NOT NULL
);

CREATE TABLE IF NOT EXISTS public.promotion_customers (
    promotion_id uuid NOT NULL,
    customer_id uuid NOT NULL
);

CREATE TABLE IF NOT EXISTS public.promotion_redemptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    promotion_id uuid NOT NULL,
    customer_id uuid NOT NULL,
    order_id uuid NOT NULL,
    redeemed_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.promotions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    condition_type text DEFAULT 'order_count_window'::text NOT NULL,
    condition_config jsonb NOT NULL,
    reward_type text NOT NULL,
    reward_value numeric(12,2),
    is_active boolean DEFAULT true NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT promotions_reward_type_check CHECK ((reward_type = ANY (ARRAY['free_delivery'::text, 'delivery_discount_percent'::text, 'delivery_discount_fixed'::text])))
);

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    endpoint text NOT NULL,
    keys jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.rate_limits (
    bucket_key text NOT NULL,
    window_start timestamp with time zone NOT NULL,
    hits integer NOT NULL
);

CREATE TABLE IF NOT EXISTS public.ratings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    customer_id uuid NOT NULL,
    agent_id uuid NOT NULL,
    stars integer NOT NULL,
    punctuality_score integer,
    behavior_score integer,
    order_accuracy_score integer,
    honesty_score integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ratings_behavior_score_check CHECK (((behavior_score >= 1) AND (behavior_score <= 5))),
    CONSTRAINT ratings_honesty_score_check CHECK (((honesty_score >= 1) AND (honesty_score <= 5))),
    CONSTRAINT ratings_order_accuracy_score_check CHECK (((order_accuracy_score >= 1) AND (order_accuracy_score <= 5))),
    CONSTRAINT ratings_punctuality_score_check CHECK (((punctuality_score >= 1) AND (punctuality_score <= 5))),
    CONSTRAINT ratings_stars_check CHECK (((stars >= 1) AND (stars <= 5)))
);

CREATE TABLE IF NOT EXISTS public.sale_units (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.user_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    device_info text,
    ip_address text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    last_active_at timestamp with time zone DEFAULT now() NOT NULL,
    revoked_at timestamp with time zone,
    revoked_by uuid,
    auth_session_id uuid
);

CREATE TABLE IF NOT EXISTS public.users (
    id uuid NOT NULL,
    phone text NOT NULL,
    full_name text NOT NULL,
    role public.user_role DEFAULT 'customer'::public.user_role NOT NULL,
    status public.user_status DEFAULT 'active'::public.user_status NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    terms_agreed_policy_id uuid,
    CONSTRAINT chk_phone_format CHECK ((phone ~ '^01[0125][0-9]{8}$'::text))
);

CREATE TABLE IF NOT EXISTS public.whatsapp_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_key text NOT NULL,
    body_text text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    updated_by uuid,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- =====================================================================
-- 4-أ) القيود: مفاتيح أساسية وفريدة وتحقق (قبل أي مفتاح خارجي)
-- =====================================================================

do $mig$
begin
  if not exists (select 1 from pg_constraint where conname = 'addresses_pkey' and conrelid = 'public.addresses'::regclass) then
    ALTER TABLE ONLY public.addresses
    ADD CONSTRAINT addresses_pkey PRIMARY KEY (id);
  end if;
end
$mig$;

do $mig$
begin
  if not exists (select 1 from pg_constraint where conname = 'agent_profiles_pkey' and conrelid = 'public.agent_profiles'::regclass) then
    ALTER TABLE ONLY public.agent_profiles
    ADD CONSTRAINT agent_profiles_pkey PRIMARY KEY (user_id);
  end if;
end
$mig$;

do $mig$
begin
  if not exists (select 1 from pg_constraint where conname = 'audit_log_pkey' and conrelid = 'public.audit_log'::regclass) then
    ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_pkey PRIMARY KEY (id);
  end if;
end
$mig$;

do $mig$
begin
  if not exists (select 1 from pg_constraint where conname = 'categories_pkey' and conrelid = 'public.categories'::regclass) then
    ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);
  end if;
end
$mig$;

do $mig$
begin
  if not exists (select 1 from pg_constraint where conname = 'commission_ledger_order_id_key' and conrelid = 'public.commission_ledger'::regclass) then
    ALTER TABLE ONLY public.commission_ledger
    ADD CONSTRAINT commission_ledger_order_id_key UNIQUE (order_id);
  end if;
end
$mig$;

do $mig$
begin
  if not exists (select 1 from pg_constraint where conname = 'commission_ledger_pkey' and conrelid = 'public.commission_ledger'::regclass) then
    ALTER TABLE ONLY public.commission_ledger
    ADD CONSTRAINT commission_ledger_pkey PRIMARY KEY (id);
  end if;
end
$mig$;

do $mig$
begin
  if not exists (select 1 from pg_constraint where conname = 'commission_payments_pkey' and conrelid = 'public.commission_payments'::regclass) then
    ALTER TABLE ONLY public.commission_payments
    ADD CONSTRAINT commission_payments_pkey PRIMARY KEY (id);
  end if;
end
$mig$;

do $mig$
begin
  if not exists (select 1 from pg_constraint where conname = 'complaints_pkey' and conrelid = 'public.complaints'::regclass) then
    ALTER TABLE ONLY public.complaints
    ADD CONSTRAINT complaints_pkey PRIMARY KEY (id);
  end if;
end
$mig$;

do $mig$
begin
  if not exists (select 1 from pg_constraint where conname = 'customer_discounts_pkey' and conrelid = 'public.customer_discounts'::regclass) then
    ALTER TABLE ONLY public.customer_discounts
    ADD CONSTRAINT customer_discounts_pkey PRIMARY KEY (id);
  end if;
end
$mig$;

do $mig$
begin
  if not exists (select 1 from pg_constraint where conname = 'customer_profiles_pkey' and conrelid = 'public.customer_profiles'::regclass) then
    ALTER TABLE ONLY public.customer_profiles
    ADD CONSTRAINT customer_profiles_pkey PRIMARY KEY (user_id);
  end if;
end
$mig$;

do $mig$
begin
  if not exists (select 1 from pg_constraint where conname = 'debt_settlements_pkey' and conrelid = 'public.debt_settlements'::regclass) then
    ALTER TABLE ONLY public.debt_settlements
    ADD CONSTRAINT debt_settlements_pkey PRIMARY KEY (id);
  end if;
end
$mig$;

do $mig$
begin
  if not exists (select 1 from pg_constraint where conname = 'debts_pkey' and conrelid = 'public.debts'::regclass) then
    ALTER TABLE ONLY public.debts
    ADD CONSTRAINT debts_pkey PRIMARY KEY (id);
  end if;
end
$mig$;

do $mig$
begin
  if not exists (select 1 from pg_constraint where conname = 'invoice_items_pkey' and conrelid = 'public.invoice_items'::regclass) then
    ALTER TABLE ONLY public.invoice_items
    ADD CONSTRAINT invoice_items_pkey PRIMARY KEY (id);
  end if;
end
$mig$;

do $mig$
begin
  if not exists (select 1 from pg_constraint where conname = 'invoices_invoice_number_key' and conrelid = 'public.invoices'::regclass) then
    ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_invoice_number_key UNIQUE (invoice_number);
  end if;
end
$mig$;

do $mig$
begin
  if not exists (select 1 from pg_constraint where conname = 'invoices_pkey' and conrelid = 'public.invoices'::regclass) then
    ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);
  end if;
end
$mig$;

do $mig$
begin
  if not exists (select 1 from pg_constraint where conname = 'notification_log_pkey' and conrelid = 'public.notification_log'::regclass) then
    ALTER TABLE ONLY public.notification_log
    ADD CONSTRAINT notification_log_pkey PRIMARY KEY (id);
  end if;
end
$mig$;

do $mig$
begin
  if not exists (select 1 from pg_constraint where conname = 'order_items_pkey' and conrelid = 'public.order_items'::regclass) then
    ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);
  end if;
end
$mig$;

do $mig$
begin
  if not exists (select 1 from pg_constraint where conname = 'order_status_history_pkey' and conrelid = 'public.order_status_history'::regclass) then
    ALTER TABLE ONLY public.order_status_history
    ADD CONSTRAINT order_status_history_pkey PRIMARY KEY (id);
  end if;
end
$mig$;

do $mig$
begin
  if not exists (select 1 from pg_constraint where conname = 'order_transfers_pkey' and conrelid = 'public.order_transfers'::regclass) then
    ALTER TABLE ONLY public.order_transfers
    ADD CONSTRAINT order_transfers_pkey PRIMARY KEY (id);
  end if;
end
$mig$;

do $mig$
begin
  if not exists (select 1 from pg_constraint where conname = 'orders_order_number_key' and conrelid = 'public.orders'::regclass) then
    ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_order_number_key UNIQUE (order_number);
  end if;
end
$mig$;

do $mig$
begin
  if not exists (select 1 from pg_constraint where conname = 'orders_pkey' and conrelid = 'public.orders'::regclass) then
    ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);
  end if;
end
$mig$;

do $mig$
begin
  if not exists (select 1 from pg_constraint where conname = 'password_reset_tokens_pkey' and conrelid = 'public.password_reset_tokens'::regclass) then
    ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (id);
  end if;
end
$mig$;

do $mig$
begin
  if not exists (select 1 from pg_constraint where conname = 'password_reset_tokens_token_hash_key' and conrelid = 'public.password_reset_tokens'::regclass) then
    ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_hash_key UNIQUE (token_hash);
  end if;
end
$mig$;

do $mig$
begin
  if not exists (select 1 from pg_constraint where conname = 'payment_proofs_order_id_key' and conrelid = 'public.payment_proofs'::regclass) then
    ALTER TABLE ONLY public.payment_proofs
    ADD CONSTRAINT payment_proofs_order_id_key UNIQUE (order_id);
  end if;
end
$mig$;

do $mig$
begin
  if not exists (select 1 from pg_constraint where conname = 'payment_proofs_pkey' and conrelid = 'public.payment_proofs'::regclass) then
    ALTER TABLE ONLY public.payment_proofs
    ADD CONSTRAINT payment_proofs_pkey PRIMARY KEY (id);
  end if;
end
$mig$;

do $mig$
begin
  if not exists (select 1 from pg_constraint where conname = 'platform_settings_pkey' and conrelid = 'public.platform_settings'::regclass) then
    ALTER TABLE ONLY public.platform_settings
    ADD CONSTRAINT platform_settings_pkey PRIMARY KEY (key);
  end if;
end
$mig$;

do $mig$
begin
  if not exists (select 1 from pg_constraint where conname = 'policies_pkey' and conrelid = 'public.policies'::regclass) then
    ALTER TABLE ONLY public.policies
    ADD CONSTRAINT policies_pkey PRIMARY KEY (id);
  end if;
end
$mig$;

do $mig$
begin
  if not exists (select 1 from pg_constraint where conname = 'policies_type_version_key' and conrelid = 'public.policies'::regclass) then
    ALTER TABLE ONLY public.policies
    ADD CONSTRAINT policies_type_version_key UNIQUE (type, version);
  end if;
end
$mig$;

do $mig$
begin
  if not exists (select 1 from pg_constraint where conname = 'policy_consents_pkey' and conrelid = 'public.policy_consents'::regclass) then
    ALTER TABLE ONLY public.policy_consents
    ADD CONSTRAINT policy_consents_pkey PRIMARY KEY (id);
  end if;
end
$mig$;

do $mig$
begin
  if not exists (select 1 from pg_constraint where conname = 'product_price_history_pkey' and conrelid = 'public.product_price_history'::regclass) then
    ALTER TABLE ONLY public.product_price_history
    ADD CONSTRAINT product_price_history_pkey PRIMARY KEY (id);
  end if;
end
$mig$;

do $mig$
begin
  if not exists (select 1 from pg_constraint where conname = 'product_subcategories_category_id_name_key' and conrelid = 'public.product_subcategories'::regclass) then
    ALTER TABLE ONLY public.product_subcategories
    ADD CONSTRAINT product_subcategories_category_id_name_key UNIQUE (category_id, name);
  end if;
end
$mig$;

do $mig$
begin
  if not exists (select 1 from pg_constraint where conname = 'product_subcategories_pkey' and conrelid = 'public.product_subcategories'::regclass) then
    ALTER TABLE ONLY public.product_subcategories
    ADD CONSTRAINT product_subcategories_pkey PRIMARY KEY (id);
  end if;
end
$mig$;

do $mig$
begin
  if not exists (select 1 from pg_constraint where conname = 'products_pkey' and conrelid = 'public.products'::regclass) then
    ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);
  end if;
end
$mig$;

do $mig$
begin
  if not exists (select 1 from pg_constraint where conname = 'products_slug_unique' and conrelid = 'public.products'::regclass) then
    ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_slug_unique UNIQUE (slug);
  end if;
end
$mig$;

do $mig$
begin
  if not exists (select 1 from pg_constraint where conname = 'promotion_customers_pkey' and conrelid = 'public.promotion_customers'::regclass) then
    ALTER TABLE ONLY public.promotion_customers
    ADD CONSTRAINT promotion_customers_pkey PRIMARY KEY (promotion_id, customer_id);
  end if;
end
$mig$;

do $mig$
begin
  if not exists (select 1 from pg_constraint where conname = 'promotion_redemptions_pkey' and conrelid = 'public.promotion_redemptions'::regclass) then
    ALTER TABLE ONLY public.promotion_redemptions
    ADD CONSTRAINT promotion_redemptions_pkey PRIMARY KEY (id);
  end if;
end
$mig$;

do $mig$
begin
  if not exists (select 1 from pg_constraint where conname = 'promotions_pkey' and conrelid = 'public.promotions'::regclass) then
    ALTER TABLE ONLY public.promotions
    ADD CONSTRAINT promotions_pkey PRIMARY KEY (id);
  end if;
end
$mig$;

do $mig$
begin
  if not exists (select 1 from pg_constraint where conname = 'push_subscriptions_endpoint_key' and conrelid = 'public.push_subscriptions'::regclass) then
    ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_endpoint_key UNIQUE (endpoint);
  end if;
end
$mig$;

do $mig$
begin
  if not exists (select 1 from pg_constraint where conname = 'push_subscriptions_pkey' and conrelid = 'public.push_subscriptions'::regclass) then
    ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_pkey PRIMARY KEY (id);
  end if;
end
$mig$;

do $mig$
begin
  if not exists (select 1 from pg_constraint where conname = 'rate_limits_pkey' and conrelid = 'public.rate_limits'::regclass) then
    ALTER TABLE ONLY public.rate_limits
    ADD CONSTRAINT rate_limits_pkey PRIMARY KEY (bucket_key);
  end if;
end
$mig$;

do $mig$
begin
  if not exists (select 1 from pg_constraint where conname = 'ratings_order_id_key' and conrelid = 'public.ratings'::regclass) then
    ALTER TABLE ONLY public.ratings
    ADD CONSTRAINT ratings_order_id_key UNIQUE (order_id);
  end if;
end
$mig$;

do $mig$
begin
  if not exists (select 1 from pg_constraint where conname = 'ratings_pkey' and conrelid = 'public.ratings'::regclass) then
    ALTER TABLE ONLY public.ratings
    ADD CONSTRAINT ratings_pkey PRIMARY KEY (id);
  end if;
end
$mig$;

do $mig$
begin
  if not exists (select 1 from pg_constraint where conname = 'sale_units_name_key' and conrelid = 'public.sale_units'::regclass) then
    ALTER TABLE ONLY public.sale_units
    ADD CONSTRAINT sale_units_name_key UNIQUE (name);
  end if;
end
$mig$;

do $mig$
begin
  if not exists (select 1 from pg_constraint where conname = 'sale_units_pkey' and conrelid = 'public.sale_units'::regclass) then
    ALTER TABLE ONLY public.sale_units
    ADD CONSTRAINT sale_units_pkey PRIMARY KEY (id);
  end if;
end
$mig$;

do $mig$
begin
  if not exists (select 1 from pg_constraint where conname = 'user_sessions_pkey' and conrelid = 'public.user_sessions'::regclass) then
    ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_pkey PRIMARY KEY (id);
  end if;
end
$mig$;

do $mig$
begin
  if not exists (select 1 from pg_constraint where conname = 'users_phone_key' and conrelid = 'public.users'::regclass) then
    ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_phone_key UNIQUE (phone);
  end if;
end
$mig$;

do $mig$
begin
  if not exists (select 1 from pg_constraint where conname = 'users_pkey' and conrelid = 'public.users'::regclass) then
    ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);
  end if;
end
$mig$;

do $mig$
begin
  if not exists (select 1 from pg_constraint where conname = 'whatsapp_templates_event_key_key' and conrelid = 'public.whatsapp_templates'::regclass) then
    ALTER TABLE ONLY public.whatsapp_templates
    ADD CONSTRAINT whatsapp_templates_event_key_key UNIQUE (event_key);
  end if;
end
$mig$;

do $mig$
begin
  if not exists (select 1 from pg_constraint where conname = 'whatsapp_templates_pkey' and conrelid = 'public.whatsapp_templates'::regclass) then
    ALTER TABLE ONLY public.whatsapp_templates
    ADD CONSTRAINT whatsapp_templates_pkey PRIMARY KEY (id);
  end if;
end
$mig$;

-- =====================================================================
-- 4-ب) القيود: مفاتيح خارجية (بعد كل المفاتيح الأساسية والفريدة)
-- =====================================================================

do $mig$
begin
  if not exists (select 1 from pg_constraint where conname = 'addresses_customer_id_fkey' and conrelid = 'public.addresses'::regclass) then
    ALTER TABLE ONLY public.addresses
    ADD CONSTRAINT addresses_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.users(id) ON DELETE CASCADE;
  end if;
end
$mig$;

do $mig$
begin
  if not exists (select 1 from pg_constraint where conname = 'agent_profiles_user_id_fkey' and conrelid = 'public.agent_profiles'::regclass) then
    ALTER TABLE ONLY public.agent_profiles
    ADD CONSTRAINT agent_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
  end if;
end
$mig$;

do $mig$
begin
  if not exists (select 1 from pg_constraint where conname = 'audit_log_actor_id_fkey' and conrelid = 'public.audit_log'::regclass) then
    ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.users(id);
  end if;
end
$mig$;

do $mig$
begin
  if not exists (select 1 from pg_constraint where conname = 'commission_ledger_order_id_fkey' and conrelid = 'public.commission_ledger'::regclass) then
    ALTER TABLE ONLY public.commission_ledger
    ADD CONSTRAINT commission_ledger_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE RESTRICT;
  end if;
end
$mig$;

do $mig$
begin
  if not exists (select 1 from pg_constraint where conname = 'commission_payments_recorded_by_fkey' and conrelid = 'public.commission_payments'::regclass) then
    ALTER TABLE ONLY public.commission_payments
    ADD CONSTRAINT commission_payments_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES public.users(id);
  end if;
end
$mig$;

do $mig$
begin
  if not exists (select 1 from pg_constraint where conname = 'complaints_agent_id_fkey' and conrelid = 'public.complaints'::regclass) then
    ALTER TABLE ONLY public.complaints
    ADD CONSTRAINT complaints_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.users(id);
  end if;
end
$mig$;

do $mig$
begin
  if not exists (select 1 from pg_constraint where conname = 'complaints_customer_id_fkey' and conrelid = 'public.complaints'::regclass) then
    ALTER TABLE ONLY public.complaints
    ADD CONSTRAINT complaints_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.users(id);
  end if;
end
$mig$;

do $mig$
begin
  if not exists (select 1 from pg_constraint where conname = 'complaints_order_id_fkey' and conrelid = 'public.complaints'::regclass) then
    ALTER TABLE ONLY public.complaints
    ADD CONSTRAINT complaints_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id);
  end if;
end
$mig$;

do $mig$
begin
  if not exists (select 1 from pg_constraint where conname = 'complaints_resolved_by_fkey' and conrelid = 'public.complaints'::regclass) then
    ALTER TABLE ONLY public.complaints
    ADD CONSTRAINT complaints_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES public.users(id);
  end if;
end
$mig$;

do $mig$
begin
  if not exists (select 1 from pg_constraint where conname = 'customer_discounts_created_by_fkey' and conrelid = 'public.customer_discounts'::regclass) then
    ALTER TABLE ONLY public.customer_discounts
    ADD CONSTRAINT customer_discounts_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);
  end if;
end
$mig$;

do $mig$
begin
  if not exists (select 1 from pg_constraint where conname = 'customer_discounts_customer_id_fkey' and conrelid = 'public.customer_discounts'::regclass) then
    ALTER TABLE ONLY public.customer_discounts
    ADD CONSTRAINT customer_discounts_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.users(id) ON DELETE CASCADE;
  end if;
end
$mig$;

do $mig$
begin
  if not exists (select 1 from pg_constraint where conname = 'customer_profiles_user_id_fkey' and conrelid = 'public.customer_profiles'::regclass) then
    ALTER TABLE ONLY public.customer_profiles
    ADD CONSTRAINT customer_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
  end if;
end
$mig$;

do $mig$
begin
  if not exists (select 1 from pg_constraint where conname = 'debt_settlements_debt_id_fkey' and conrelid = 'public.debt_settlements'::regclass) then
    ALTER TABLE ONLY public.debt_settlements
    ADD CONSTRAINT debt_settlements_debt_id_fkey FOREIGN KEY (debt_id) REFERENCES public.debts(id) ON DELETE CASCADE;
  end if;
end
$mig$;

do $mig$
begin
  if not exists (select 1 from pg_constraint where conname = 'debt_settlements_settled_by_fkey' and conrelid = 'public.debt_settlements'::regclass) then
    ALTER TABLE ONLY public.debt_settlements
    ADD CONSTRAINT debt_settlements_settled_by_fkey FOREIGN KEY (settled_by) REFERENCES public.users(id);
  end if;
end
$mig$;

do $mig$
begin
  if not exists (select 1 from pg_constraint where conname = 'debts_customer_id_fkey' and conrelid = 'public.debts'::regclass) then
    ALTER TABLE ONLY public.debts
    ADD CONSTRAINT debts_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.users(id) ON DELETE RESTRICT;
  end if;
end
$mig$;

do $mig$
begin
  if not exists (select 1 from pg_constraint where conname = 'debts_order_id_fkey' and conrelid = 'public.debts'::regclass) then
    ALTER TABLE ONLY public.debts
    ADD CONSTRAINT debts_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE SET NULL;
  end if;
end
$mig$;

do $mig$
begin
  if not exists (select 1 from pg_constraint where conname = 'fk_customer_default_address' and conrelid = 'public.customer_profiles'::regclass) then
    ALTER TABLE ONLY public.customer_profiles
    ADD CONSTRAINT fk_customer_default_address FOREIGN KEY (default_address_id) REFERENCES public.addresses(id) ON DELETE SET NULL;
  end if;
end
$mig$;

do $mig$
begin
  if not exists (select 1 from pg_constraint where conname = 'fk_price_history_invoice_item' and conrelid = 'public.product_price_history'::regclass) then
    ALTER TABLE ONLY public.product_price_history
    ADD CONSTRAINT fk_price_history_invoice_item FOREIGN KEY (source_invoice_item_id) REFERENCES public.invoice_items(id) ON DELETE SET NULL;
  end if;
end
$mig$;

do $mig$
begin
  if not exists (select 1 from pg_constraint where conname = 'invoice_items_invoice_id_fkey' and conrelid = 'public.invoice_items'::regclass) then
    ALTER TABLE ONLY public.invoice_items
    ADD CONSTRAINT invoice_items_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE CASCADE;
  end if;
end
$mig$;

do $mig$
begin
  if not exists (select 1 from pg_constraint where conname = 'invoice_items_order_item_id_fkey' and conrelid = 'public.invoice_items'::regclass) then
    ALTER TABLE ONLY public.invoice_items
    ADD CONSTRAINT invoice_items_order_item_id_fkey FOREIGN KEY (order_item_id) REFERENCES public.order_items(id);
  end if;
end
$mig$;

do $mig$
begin
  if not exists (select 1 from pg_constraint where conname = 'invoice_items_product_id_fkey' and conrelid = 'public.invoice_items'::regclass) then
    ALTER TABLE ONLY public.invoice_items
    ADD CONSTRAINT invoice_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);
  end if;
end
$mig$;

do $mig$
begin
  if not exists (select 1 from pg_constraint where conname = 'invoices_approved_by_fkey' and conrelid = 'public.invoices'::regclass) then
    ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);
  end if;
end
$mig$;

do $mig$
begin
  if not exists (select 1 from pg_constraint where conname = 'invoices_canceled_by_fkey' and conrelid = 'public.invoices'::regclass) then
    ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_canceled_by_fkey FOREIGN KEY (canceled_by) REFERENCES public.users(id);
  end if;
end
$mig$;

do $mig$
begin
  if not exists (select 1 from pg_constraint where conname = 'invoices_order_id_fkey' and conrelid = 'public.invoices'::regclass) then
    ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE RESTRICT;
  end if;
end
$mig$;

do $mig$
begin
  if not exists (select 1 from pg_constraint where conname = 'invoices_superseded_by_invoice_id_fkey' and conrelid = 'public.invoices'::regclass) then
    ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_superseded_by_invoice_id_fkey FOREIGN KEY (superseded_by_invoice_id) REFERENCES public.invoices(id);
  end if;
end
$mig$;

do $mig$
begin
  if not exists (select 1 from pg_constraint where conname = 'notification_log_recipient_id_fkey' and conrelid = 'public.notification_log'::regclass) then
    ALTER TABLE ONLY public.notification_log
    ADD CONSTRAINT notification_log_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES public.users(id);
  end if;
end
$mig$;

do $mig$
begin
  if not exists (select 1 from pg_constraint where conname = 'order_items_converted_product_id_fkey' and conrelid = 'public.order_items'::regclass) then
    ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_converted_product_id_fkey FOREIGN KEY (converted_product_id) REFERENCES public.products(id);
  end if;
end
$mig$;

do $mig$
begin
  if not exists (select 1 from pg_constraint where conname = 'order_items_manual_category_id_fkey' and conrelid = 'public.order_items'::regclass) then
    ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_manual_category_id_fkey FOREIGN KEY (manual_category_id) REFERENCES public.categories(id);
  end if;
end
$mig$;

do $mig$
begin
  if not exists (select 1 from pg_constraint where conname = 'order_items_order_id_fkey' and conrelid = 'public.order_items'::regclass) then
    ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;
  end if;
end
$mig$;

do $mig$
begin
  if not exists (select 1 from pg_constraint where conname = 'order_items_product_id_fkey' and conrelid = 'public.order_items'::regclass) then
    ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE RESTRICT;
  end if;
end
$mig$;

do $mig$
begin
  if not exists (select 1 from pg_constraint where conname = 'order_items_unit_id_fkey' and conrelid = 'public.order_items'::regclass) then
    ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.sale_units(id);
  end if;
end
$mig$;

do $mig$
begin
  if not exists (select 1 from pg_constraint where conname = 'order_status_history_changed_by_fkey' and conrelid = 'public.order_status_history'::regclass) then
    ALTER TABLE ONLY public.order_status_history
    ADD CONSTRAINT order_status_history_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES public.users(id);
  end if;
end
$mig$;

do $mig$
begin
  if not exists (select 1 from pg_constraint where conname = 'order_status_history_order_id_fkey' and conrelid = 'public.order_status_history'::regclass) then
    ALTER TABLE ONLY public.order_status_history
    ADD CONSTRAINT order_status_history_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;
  end if;
end
$mig$;

do $mig$
begin
  if not exists (select 1 from pg_constraint where conname = 'order_transfers_from_agent_id_fkey' and conrelid = 'public.order_transfers'::regclass) then
    ALTER TABLE ONLY public.order_transfers
    ADD CONSTRAINT order_transfers_from_agent_id_fkey FOREIGN KEY (from_agent_id) REFERENCES public.users(id);
  end if;
end
$mig$;

do $mig$
begin
  if not exists (select 1 from pg_constraint where conname = 'order_transfers_order_id_fkey' and conrelid = 'public.order_transfers'::regclass) then
    ALTER TABLE ONLY public.order_transfers
    ADD CONSTRAINT order_transfers_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;
  end if;
end
$mig$;

do $mig$
begin
  if not exists (select 1 from pg_constraint where conname = 'order_transfers_to_agent_id_fkey' and conrelid = 'public.order_transfers'::regclass) then
    ALTER TABLE ONLY public.order_transfers
    ADD CONSTRAINT order_transfers_to_agent_id_fkey FOREIGN KEY (to_agent_id) REFERENCES public.users(id);
  end if;
end
$mig$;

do $mig$
begin
  if not exists (select 1 from pg_constraint where conname = 'orders_applied_discount_id_fkey' and conrelid = 'public.orders'::regclass) then
    ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_applied_discount_id_fkey FOREIGN KEY (applied_discount_id) REFERENCES public.customer_discounts(id);
  end if;
end
$mig$;

do $mig$
begin
  if not exists (select 1 from pg_constraint where conname = 'orders_applied_promotion_id_fkey' and conrelid = 'public.orders'::regclass) then
    ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_applied_promotion_id_fkey FOREIGN KEY (applied_promotion_id) REFERENCES public.promotions(id);
  end if;
end
$mig$;

do $mig$
begin
  if not exists (select 1 from pg_constraint where conname = 'orders_assigned_agent_id_fkey' and conrelid = 'public.orders'::regclass) then
    ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_assigned_agent_id_fkey FOREIGN KEY (assigned_agent_id) REFERENCES public.users(id) ON DELETE SET NULL;
  end if;
end
$mig$;

do $mig$
begin
  if not exists (select 1 from pg_constraint where conname = 'orders_canceled_by_fkey' and conrelid = 'public.orders'::regclass) then
    ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_canceled_by_fkey FOREIGN KEY (canceled_by) REFERENCES public.users(id);
  end if;
end
$mig$;

do $mig$
begin
  if not exists (select 1 from pg_constraint where conname = 'orders_customer_id_fkey' and conrelid = 'public.orders'::regclass) then
    ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.users(id) ON DELETE RESTRICT;
  end if;
end
$mig$;

do $mig$
begin
  if not exists (select 1 from pg_constraint where conname = 'orders_rejected_by_fkey' and conrelid = 'public.orders'::regclass) then
    ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_rejected_by_fkey FOREIGN KEY (rejected_by) REFERENCES public.users(id);
  end if;
end
$mig$;

do $mig$
begin
  if not exists (select 1 from pg_constraint where conname = 'password_reset_tokens_created_by_fkey' and conrelid = 'public.password_reset_tokens'::regclass) then
    ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);
  end if;
end
$mig$;

do $mig$
begin
  if not exists (select 1 from pg_constraint where conname = 'password_reset_tokens_user_id_fkey' and conrelid = 'public.password_reset_tokens'::regclass) then
    ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
  end if;
end
$mig$;

do $mig$
begin
  if not exists (select 1 from pg_constraint where conname = 'payment_proofs_order_id_fkey' and conrelid = 'public.payment_proofs'::regclass) then
    ALTER TABLE ONLY public.payment_proofs
    ADD CONSTRAINT payment_proofs_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;
  end if;
end
$mig$;

do $mig$
begin
  if not exists (select 1 from pg_constraint where conname = 'payment_proofs_reviewed_by_fkey' and conrelid = 'public.payment_proofs'::regclass) then
    ALTER TABLE ONLY public.payment_proofs
    ADD CONSTRAINT payment_proofs_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.users(id);
  end if;
end
$mig$;

do $mig$
begin
  if not exists (select 1 from pg_constraint where conname = 'platform_settings_updated_by_fkey' and conrelid = 'public.platform_settings'::regclass) then
    ALTER TABLE ONLY public.platform_settings
    ADD CONSTRAINT platform_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);
  end if;
end
$mig$;

do $mig$
begin
  if not exists (select 1 from pg_constraint where conname = 'policy_consents_order_id_fkey' and conrelid = 'public.policy_consents'::regclass) then
    ALTER TABLE ONLY public.policy_consents
    ADD CONSTRAINT policy_consents_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id);
  end if;
end
$mig$;

do $mig$
begin
  if not exists (select 1 from pg_constraint where conname = 'policy_consents_policy_id_fkey' and conrelid = 'public.policy_consents'::regclass) then
    ALTER TABLE ONLY public.policy_consents
    ADD CONSTRAINT policy_consents_policy_id_fkey FOREIGN KEY (policy_id) REFERENCES public.policies(id);
  end if;
end
$mig$;

do $mig$
begin
  if not exists (select 1 from pg_constraint where conname = 'policy_consents_user_id_fkey' and conrelid = 'public.policy_consents'::regclass) then
    ALTER TABLE ONLY public.policy_consents
    ADD CONSTRAINT policy_consents_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);
  end if;
end
$mig$;

do $mig$
begin
  if not exists (select 1 from pg_constraint where conname = 'product_price_history_product_id_fkey' and conrelid = 'public.product_price_history'::regclass) then
    ALTER TABLE ONLY public.product_price_history
    ADD CONSTRAINT product_price_history_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;
  end if;
end
$mig$;

do $mig$
begin
  if not exists (select 1 from pg_constraint where conname = 'product_subcategories_category_id_fkey' and conrelid = 'public.product_subcategories'::regclass) then
    ALTER TABLE ONLY public.product_subcategories
    ADD CONSTRAINT product_subcategories_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE CASCADE;
  end if;
end
$mig$;

do $mig$
begin
  if not exists (select 1 from pg_constraint where conname = 'products_category_id_fkey' and conrelid = 'public.products'::regclass) then
    ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE RESTRICT;
  end if;
end
$mig$;

do $mig$
begin
  if not exists (select 1 from pg_constraint where conname = 'products_sale_unit_id_fkey' and conrelid = 'public.products'::regclass) then
    ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_sale_unit_id_fkey FOREIGN KEY (sale_unit_id) REFERENCES public.sale_units(id) ON DELETE RESTRICT;
  end if;
end
$mig$;

do $mig$
begin
  if not exists (select 1 from pg_constraint where conname = 'products_subcategory_id_fkey' and conrelid = 'public.products'::regclass) then
    ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_subcategory_id_fkey FOREIGN KEY (subcategory_id) REFERENCES public.product_subcategories(id) ON DELETE SET NULL;
  end if;
end
$mig$;

do $mig$
begin
  if not exists (select 1 from pg_constraint where conname = 'promotion_customers_customer_id_fkey' and conrelid = 'public.promotion_customers'::regclass) then
    ALTER TABLE ONLY public.promotion_customers
    ADD CONSTRAINT promotion_customers_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.users(id) ON DELETE CASCADE;
  end if;
end
$mig$;

do $mig$
begin
  if not exists (select 1 from pg_constraint where conname = 'promotion_customers_promotion_id_fkey' and conrelid = 'public.promotion_customers'::regclass) then
    ALTER TABLE ONLY public.promotion_customers
    ADD CONSTRAINT promotion_customers_promotion_id_fkey FOREIGN KEY (promotion_id) REFERENCES public.promotions(id) ON DELETE CASCADE;
  end if;
end
$mig$;

do $mig$
begin
  if not exists (select 1 from pg_constraint where conname = 'promotion_redemptions_customer_id_fkey' and conrelid = 'public.promotion_redemptions'::regclass) then
    ALTER TABLE ONLY public.promotion_redemptions
    ADD CONSTRAINT promotion_redemptions_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.users(id);
  end if;
end
$mig$;

do $mig$
begin
  if not exists (select 1 from pg_constraint where conname = 'promotion_redemptions_order_id_fkey' and conrelid = 'public.promotion_redemptions'::regclass) then
    ALTER TABLE ONLY public.promotion_redemptions
    ADD CONSTRAINT promotion_redemptions_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id);
  end if;
end
$mig$;

do $mig$
begin
  if not exists (select 1 from pg_constraint where conname = 'promotion_redemptions_promotion_id_fkey' and conrelid = 'public.promotion_redemptions'::regclass) then
    ALTER TABLE ONLY public.promotion_redemptions
    ADD CONSTRAINT promotion_redemptions_promotion_id_fkey FOREIGN KEY (promotion_id) REFERENCES public.promotions(id);
  end if;
end
$mig$;

do $mig$
begin
  if not exists (select 1 from pg_constraint where conname = 'promotions_created_by_fkey' and conrelid = 'public.promotions'::regclass) then
    ALTER TABLE ONLY public.promotions
    ADD CONSTRAINT promotions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);
  end if;
end
$mig$;

do $mig$
begin
  if not exists (select 1 from pg_constraint where conname = 'push_subscriptions_user_id_fkey' and conrelid = 'public.push_subscriptions'::regclass) then
    ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
  end if;
end
$mig$;

do $mig$
begin
  if not exists (select 1 from pg_constraint where conname = 'ratings_agent_id_fkey' and conrelid = 'public.ratings'::regclass) then
    ALTER TABLE ONLY public.ratings
    ADD CONSTRAINT ratings_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.users(id);
  end if;
end
$mig$;

do $mig$
begin
  if not exists (select 1 from pg_constraint where conname = 'ratings_customer_id_fkey' and conrelid = 'public.ratings'::regclass) then
    ALTER TABLE ONLY public.ratings
    ADD CONSTRAINT ratings_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.users(id);
  end if;
end
$mig$;

do $mig$
begin
  if not exists (select 1 from pg_constraint where conname = 'ratings_order_id_fkey' and conrelid = 'public.ratings'::regclass) then
    ALTER TABLE ONLY public.ratings
    ADD CONSTRAINT ratings_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;
  end if;
end
$mig$;

do $mig$
begin
  if not exists (select 1 from pg_constraint where conname = 'user_sessions_revoked_by_fkey' and conrelid = 'public.user_sessions'::regclass) then
    ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_revoked_by_fkey FOREIGN KEY (revoked_by) REFERENCES public.users(id);
  end if;
end
$mig$;

do $mig$
begin
  if not exists (select 1 from pg_constraint where conname = 'user_sessions_user_id_fkey' and conrelid = 'public.user_sessions'::regclass) then
    ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
  end if;
end
$mig$;

do $mig$
begin
  if not exists (select 1 from pg_constraint where conname = 'users_terms_agreed_policy_id_fkey' and conrelid = 'public.users'::regclass) then
    ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_terms_agreed_policy_id_fkey FOREIGN KEY (terms_agreed_policy_id) REFERENCES public.policies(id);
  end if;
end
$mig$;

do $mig$
begin
  if not exists (select 1 from pg_constraint where conname = 'whatsapp_templates_updated_by_fkey' and conrelid = 'public.whatsapp_templates'::regclass) then
    ALTER TABLE ONLY public.whatsapp_templates
    ADD CONSTRAINT whatsapp_templates_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);
  end if;
end
$mig$;

-- =====================================================================
-- 5) خصائص إضافية على الجداول (RLS تفعيل، قيم افتراضية)
-- =====================================================================

ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.agent_profiles ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.commission_ledger ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.commission_payments ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.customer_discounts ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.customer_profiles ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.debt_settlements ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.debts ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.order_transfers ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.payment_proofs ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.policies ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.policy_consents ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.product_price_history ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.product_subcategories ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.promotion_customers ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.promotion_redemptions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.sale_units ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- 6) الفهارس (Indexes)
-- =====================================================================

CREATE INDEX IF NOT EXISTS idx_addresses_customer ON public.addresses USING btree (customer_id);

CREATE INDEX IF NOT EXISTS idx_audit_actor ON public.audit_log USING btree (actor_id);

CREATE INDEX IF NOT EXISTS idx_audit_created_at ON public.audit_log USING btree (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_entity ON public.audit_log USING btree (entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_commission_status ON public.commission_ledger USING btree (status);

CREATE INDEX IF NOT EXISTS idx_complaints_customer ON public.complaints USING btree (customer_id);

CREATE INDEX IF NOT EXISTS idx_complaints_status ON public.complaints USING btree (status);

CREATE INDEX IF NOT EXISTS idx_debts_customer_status ON public.debts USING btree (customer_id, status);

CREATE INDEX IF NOT EXISTS idx_discounts_customer ON public.customer_discounts USING btree (customer_id) WHERE (is_active = true);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON public.invoice_items USING btree (invoice_id);

CREATE INDEX IF NOT EXISTS idx_notification_recipient ON public.notification_log USING btree (recipient_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items USING btree (order_id);

CREATE INDEX IF NOT EXISTS idx_orders_agent_status ON public.orders USING btree (assigned_agent_id, status);

CREATE INDEX IF NOT EXISTS idx_orders_customer_status ON public.orders USING btree (customer_id, status);

CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders USING btree (status);

CREATE INDEX IF NOT EXISTS idx_payment_proofs_status ON public.payment_proofs USING btree (status);

CREATE INDEX IF NOT EXISTS idx_price_history_product ON public.product_price_history USING btree (product_id, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_products_category ON public.products USING btree (category_id) WHERE (status = 'active'::public.product_status);

CREATE INDEX IF NOT EXISTS idx_products_description_trgm ON public.products USING gin (description extensions.gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON public.products USING gin (name extensions.gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_products_subcategory ON public.products USING btree (subcategory_id);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON public.user_sessions USING btree (user_id) WHERE (revoked_at IS NULL);

CREATE UNIQUE INDEX IF NOT EXISTS user_sessions_auth_session_id_key ON public.user_sessions USING btree (auth_session_id) WHERE (auth_session_id IS NOT NULL);

-- =====================================================================
-- 7) الدوال (Functions)
-- =====================================================================

CREATE OR REPLACE FUNCTION public.accept_order(p_order_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_status public.order_status;
  v_customer uuid;
  v_order_number text;
begin
  if not public.is_admin() then
    raise exception 'فقط الإدارة تستطيع قبول الطلب';
  end if;

  select status, customer_id, order_number into v_status, v_customer, v_order_number
  from public.orders where id = p_order_id for update;
  if v_status is null then raise exception 'الطلب غير موجود'; end if;
  if v_status <> 'review' then
    raise exception 'لا يمكن قبول طلب في حالته الحالية: %', v_status;
  end if;

  update public.orders set accepted_at = now() where id = p_order_id;

  perform public.fn_transition_order(p_order_id, 'accepted');
  perform public.fn_log_audit('order.accept', 'orders', p_order_id);
  perform public.fn_queue_push('order_accepted', v_customer, format('تم قبول طلبك رقم %s وجارٍ تجهيزه', v_order_number));

  perform public.fn_transition_order(p_order_id, 'shopping');

  -- بث فوري لكل المندوبين إن فيه طلب جديد متاح (زر "قبول الطلب" هيظهر
  -- فورًا في شاشتهم من غير ما يحتاجوا يعملوا Refresh، لأن التغيير في
  -- جدول orders نفسه — اللي هما مشتركين فيه Realtime بالفعل)
end;
$$;

CREATE OR REPLACE FUNCTION public.admin_claim_order(p_order_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_status public.order_status;
  v_existing_agent uuid;
begin
  if not public.is_admin() then
    raise exception 'هذا الإجراء متاح للإدارة فقط';
  end if;

  select status, assigned_agent_id into v_status, v_existing_agent
  from public.orders where id = p_order_id for update;

  if v_status is null then raise exception 'الطلب غير موجود'; end if;
  if v_status not in ('shopping', 'invoice_preparation', 'invoice_approved', 'ready_for_delivery') then
    raise exception 'لا يمكن استلام الطلب في حالته الحالية: %', v_status;
  end if;
  if v_existing_agent = auth.uid() then
    raise exception 'الطلب متعيّن لك بالفعل';
  end if;

  insert into public.agent_profiles (user_id) values (auth.uid()) on conflict (user_id) do nothing;

  if v_existing_agent is not null then
    update public.agent_profiles
    set availability_status = 'available', current_active_orders_count = greatest(current_active_orders_count - 1, 0)
    where user_id = v_existing_agent;
  end if;

  update public.orders set assigned_agent_id = auth.uid() where id = p_order_id;
  update public.agent_profiles
  set availability_status = 'busy', current_active_orders_count = current_active_orders_count + 1
  where user_id = auth.uid();

  if v_status = 'ready_for_delivery' then
    perform public.fn_transition_order(p_order_id, 'assigned');
  end if;

  perform public.fn_log_audit('order.admin_claim', 'orders', p_order_id, null, jsonb_build_object('agent_id', auth.uid()));
end;
$$;

CREATE OR REPLACE FUNCTION public.approve_invoice(p_invoice_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_order_id uuid;
  v_status   public.invoice_status;
  v_agent_id uuid;
  v_item     record;
begin
  select order_id, status into v_order_id, v_status
  from public.invoices where id = p_invoice_id for update;

  if v_order_id is null then raise exception 'الفاتورة غير موجودة'; end if;

  select assigned_agent_id into v_agent_id from public.orders where id = v_order_id;

  if not (public.is_admin() or (public.is_agent() and v_agent_id = auth.uid())) then
    raise exception 'اعتماد الفاتورة صلاحية إدارية أو للمندوب المسند للطلب فقط';
  end if;

  if v_status <> 'draft' then
    raise exception 'لا يمكن اعتماد فاتورة ليست في حالة مسودة';
  end if;

  update public.invoices
  set status = 'approved', approved_by = auth.uid(), approved_at = now()
  where id = p_invoice_id;

  for v_item in
    select ii.id as invoice_item_id, ii.product_id, ii.actual_price
    from public.invoice_items ii
    where ii.invoice_id = p_invoice_id and ii.is_available = true and ii.product_id is not null
  loop
    insert into public.product_price_history (product_id, price, source_invoice_item_id)
    values (v_item.product_id, v_item.actual_price, v_item.invoice_item_id);

    update public.products set last_known_price = v_item.actual_price where id = v_item.product_id;
  end loop;

  perform public.fn_transition_order(v_order_id, 'invoice_approved');
  perform public.fn_log_audit('invoice.approve', 'invoices', p_invoice_id);

  perform public.fn_transition_order(v_order_id, 'ready_for_delivery');

  perform public.assign_next_agent(v_order_id);
end;
$$;

CREATE OR REPLACE FUNCTION public.assign_next_agent(p_order_id uuid) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_agent uuid;
begin
  select assigned_agent_id into v_agent from public.orders where id = p_order_id;

  if v_agent is not null then
    perform public.fn_transition_order(p_order_id, 'assigned');
  end if;

  return v_agent;
end;
$$;

CREATE OR REPLACE FUNCTION public.audit_platform_settings() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  insert into public.audit_log (actor_id, actor_role, action, entity_type, entity_id, old_value, new_value)
  values (
    auth.uid(),
    public.current_role(),
    'platform_settings.update',
    'platform_settings',
    null,
    case when tg_op = 'UPDATE' then to_jsonb(old) else null end,
    to_jsonb(new)
  );
  return new;
end;
$$;

CREATE OR REPLACE FUNCTION public.cancel_invoice(p_invoice_id uuid, p_reason text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_order_id uuid;
  v_status   public.invoice_status;
  v_new_invoice_id uuid;
begin
  if not public.is_admin() then raise exception 'صلاحية إدارية فقط'; end if;
  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'يجب إدخال سبب إلغاء الفاتورة';
  end if;

  select order_id, status into v_order_id, v_status from public.invoices where id = p_invoice_id;
  if v_status <> 'approved' then
    raise exception 'يمكن فقط إلغاء فاتورة معتمدة لتصحيحها';
  end if;

  update public.invoices
  set status = 'canceled', canceled_reason = p_reason, canceled_by = auth.uid(), canceled_at = now()
  where id = p_invoice_id;

  perform public.fn_log_audit('invoice.cancel', 'invoices', p_invoice_id, null, null, p_reason);

  perform public.fn_transition_order(v_order_id, 'invoice_preparation', p_reason);

  v_new_invoice_id := public.submit_for_invoice(v_order_id);

  update public.invoices set superseded_by_invoice_id = v_new_invoice_id where id = p_invoice_id;

  return v_new_invoice_id;
end;
$$;

CREATE OR REPLACE FUNCTION public.cancel_order_by_business(p_order_id uuid, p_reason text, p_is_uncontactable boolean DEFAULT false) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_status      public.order_status;
  v_customer_id uuid;
  v_agent_id    uuid;
  v_order_number text;
begin
  if not public.is_admin() then raise exception 'صلاحية إدارية فقط'; end if;
  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'يجب إدخال سبب الإلغاء';
  end if;

  select status, customer_id, assigned_agent_id, order_number
  into v_status, v_customer_id, v_agent_id, v_order_number
  from public.orders where id = p_order_id for update;

  if v_status in ('delivered','canceled_by_customer','canceled_by_business','rejected') then
    raise exception 'لا يمكن إلغاء طلب في حالته الحالية';
  end if;

  update public.orders set cancellation_reason = p_reason, canceled_by = auth.uid(), canceled_at = now()
  where id = p_order_id;

  if p_is_uncontactable then
    perform public.fn_create_cancellation_debt(v_customer_id, p_order_id, 'uncontactable');
  end if;

  if v_agent_id is not null and v_status in ('assigned','on_the_way') then
    update public.agent_profiles
    set availability_status = 'available', current_active_orders_count = greatest(current_active_orders_count - 1, 0)
    where user_id = v_agent_id;
  end if;

  perform public.fn_transition_order(p_order_id, 'canceled_by_business', p_reason);
  perform public.fn_log_audit('order.cancel_by_business', 'orders', p_order_id, null, null, p_reason);
  perform public.fn_queue_push('order_canceled', v_customer_id, format('تم إلغاء طلبك رقم %s', v_order_number));
end;
$$;

CREATE OR REPLACE FUNCTION public.cancel_order_by_customer(p_order_id uuid, p_reason text DEFAULT NULL::text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_status      public.order_status;
  v_customer_id uuid;
begin
  select status, customer_id into v_status, v_customer_id from public.orders where id = p_order_id for update;
  if auth.uid() is null or v_customer_id is distinct from auth.uid() then raise exception 'هذا ليس طلبك'; end if;
  if v_status in ('delivered','canceled_by_customer','canceled_by_business','rejected') then
    raise exception 'لا يمكن إلغاء طلب في حالته الحالية';
  end if;

  update public.orders set cancellation_reason = p_reason, canceled_by = auth.uid(), canceled_at = now()
  where id = p_order_id;

  if v_status not in ('review') then
    perform public.fn_create_cancellation_debt(v_customer_id, p_order_id, 'customer_cancellation');
  end if;

  update public.agent_profiles ap
  set availability_status = 'available', current_active_orders_count = greatest(current_active_orders_count - 1, 0)
  from public.orders o
  where o.id = p_order_id and o.assigned_agent_id = ap.user_id and v_status in ('assigned','on_the_way');

  perform public.fn_transition_order(p_order_id, 'canceled_by_customer', p_reason);
  perform public.fn_log_audit('order.cancel_by_customer', 'orders', p_order_id, null, null, p_reason);
end;
$$;

CREATE OR REPLACE FUNCTION public.claim_order(p_order_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_status  public.order_status;
  v_claimed uuid;
begin
  if not public.is_agent() then
    raise exception 'استلام الطلبات متاح للمندوبين فقط';
  end if;
  if public.current_user_status() <> 'active' then
    raise exception 'حسابك محظور أو موقوف';
  end if;

  -- القفل هنا (for update) هو اللي بيضمن، لو مندوبين ضغطوا في نفس اللحظة
  -- بالظبط، إن التاني يستنى لحد ما الأول يخلّص، وبعدها يشوف إن الطلب
  -- اتاخد فعلاً ويترفض — مش ممكن اتنين ياخدوا نفس الطلب أبدًا
  select status into v_status from public.orders where id = p_order_id for update;
  if v_status is null then raise exception 'الطلب غير موجود'; end if;
  if v_status not in ('shopping', 'ready_for_delivery') then
    raise exception 'الطلب ده مش متاح للاستلام دلوقتي';
  end if;

  update public.orders set assigned_agent_id = auth.uid()
  where id = p_order_id and assigned_agent_id is null
  returning assigned_agent_id into v_claimed;

  if v_claimed is null then
    raise exception 'الطلب ده اتاخد بالفعل من مندوب تاني — جرّب طلب تاني';
  end if;

  insert into public.agent_profiles (user_id) values (auth.uid()) on conflict (user_id) do nothing;
  update public.agent_profiles
  set current_active_orders_count = current_active_orders_count + 1
  where user_id = auth.uid();

  if v_status = 'ready_for_delivery' then
    perform public.fn_transition_order(p_order_id, 'assigned');
  end if;

  perform public.fn_log_audit('order.claim', 'orders', p_order_id, null,
    jsonb_build_object('agent_id', auth.uid()));
end;
$$;

CREATE OR REPLACE FUNCTION public.confirm_password_reset(p_token text, p_new_password text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'extensions'
    AS $$
declare
  v_token_hash text;
  v_user_id    uuid;
begin
  if length(p_new_password) < 8 then
    raise exception 'كلمة المرور يجب ألا تقل عن 8 أحرف';
  end if;
  if octet_length(p_new_password) > 72 then
    raise exception 'كلمة المرور طويلة جدًا';
  end if;

  v_token_hash := encode(digest(p_token, 'sha256'), 'hex');

  select user_id into v_user_id
  from public.password_reset_tokens
  where token_hash = v_token_hash and used_at is null and expires_at > now();

  if v_user_id is null then
    raise exception 'الرابط غير صالح أو منتهي الصلاحية';
  end if;

  update auth.users
  set encrypted_password = crypt(p_new_password, gen_salt('bf', 10))
  where id = v_user_id;

  update public.password_reset_tokens set used_at = now() where user_id = v_user_id and used_at is null;

  perform public.fn_revoke_user_sessions(v_user_id);

  perform public.fn_log_audit('password_reset.confirm', 'users', v_user_id);
end;
$$;

CREATE OR REPLACE FUNCTION public.consume_rate_limit(p_action text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_max_hits       integer;
  v_window_seconds integer;
  v_key            text;
  v_hits           integer;
begin
  if auth.uid() is null then
    raise exception 'غير مصرح';
  end if;

  case p_action
    when 'cloudinary_sign' then v_max_hits := 20; v_window_seconds := 600;
    else raise exception 'إجراء غير معروف';
  end case;

  v_key := auth.uid()::text || ':' || p_action;

  insert into public.rate_limits as r (bucket_key, window_start, hits)
  values (v_key, now(), 1)
  on conflict (bucket_key) do update set
    hits = case when r.window_start < now() - make_interval(secs => v_window_seconds) then 1 else r.hits + 1 end,
    window_start = case when r.window_start < now() - make_interval(secs => v_window_seconds) then now() else r.window_start end
  returning hits into v_hits;

  return v_hits <= v_max_hits;
end;
$$;

CREATE OR REPLACE FUNCTION public.create_order(p_items jsonb, p_address_id uuid, p_custom_address_text text, p_payment_method public.payment_method, p_policy_id uuid, p_payment_proof_image_url text DEFAULT NULL::text, p_payment_sender_name text DEFAULT NULL::text, p_payment_sender_number text DEFAULT NULL::text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $_$
declare
  v_order_id       uuid;
  v_customer_id    uuid := auth.uid();
  v_address_json   jsonb;
  v_outstanding    numeric(12,2);
  v_delivery_fee   numeric(12,2);
  v_original_fee   numeric(12,2);
  v_item           jsonb;
  v_displayed_price numeric(12,2);
  v_manual_category_id uuid;
  v_manual_image_url   text;
  v_target_price    numeric(12,2);
  v_quantity        numeric(10,3);
  v_unit_id         uuid;

  v_discount       record;
  v_promo          record;
  v_applied_discount_id  uuid;
  v_applied_promotion_id uuid;
  v_recent_orders_count  integer;
  v_new_order_number     text;
  v_active_orders        integer;
  v_max_active_orders    integer;
begin
  if public.current_role() <> 'customer' then
    raise exception 'فقط العميل يستطيع إنشاء طلب';
  end if;

  if public.current_user_status() <> 'active' then
    raise exception 'الحساب محظور أو موقوف — يرجى التواصل مع الخدمة';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'الطلب يجب أن يحتوي على صنف واحد على الأقل';
  end if;
  if jsonb_array_length(p_items) > 100 then
    raise exception 'عدد الأصناف في الطلب الواحد لا يمكن أن يتجاوز 100 صنف';
  end if;

  perform 1 from public.users where id = v_customer_id for update;
  v_max_active_orders := coalesce(public.get_setting_numeric('max_active_orders_per_customer'), 5)::integer;
  select count(*) into v_active_orders from public.orders
  where customer_id = v_customer_id
    and status not in ('delivered', 'canceled_by_customer', 'canceled_by_business', 'rejected');
  if v_active_orders >= v_max_active_orders then
    raise exception 'لديك % طلبات قيد التنفيذ بالفعل — انتظر اكتمال أحدها قبل إنشاء طلب جديد', v_active_orders;
  end if;

  if p_address_id is not null then
    select jsonb_build_object(
      'label', label, 'full_address_text', full_address_text
    ) into v_address_json
    from public.addresses
    where id = p_address_id and customer_id = v_customer_id;

    if v_address_json is null then
      raise exception 'العنوان غير موجود أو لا يخصك';
    end if;
  else
    if p_custom_address_text is null or length(trim(p_custom_address_text)) = 0 then
      raise exception 'يجب تحديد عنوان للتسليم';
    end if;
    if length(p_custom_address_text) > 500 then
      raise exception 'العنوان طويل جدًا';
    end if;
    v_address_json := jsonb_build_object('label', 'عنوان مخصص لهذا الطلب', 'full_address_text', p_custom_address_text);
  end if;

  if p_payment_method <> 'cash' and (p_payment_proof_image_url is null or length(trim(p_payment_proof_image_url)) = 0) then
    raise exception 'يجب رفع صورة إثبات التحويل عند اختيار الدفع الإلكتروني';
  end if;

  if p_payment_proof_image_url is not null
     and (length(p_payment_proof_image_url) > 500
          or p_payment_proof_image_url !~ '^https://res\.cloudinary\.com/[A-Za-z0-9_-]+/image/upload/[^[:space:]]+$') then
    raise exception 'رابط صورة الإثبات غير صالح';
  end if;
  if length(coalesce(p_payment_sender_name, '')) > 100 or length(coalesce(p_payment_sender_number, '')) > 50 then
    raise exception 'بيانات المُرسِل طويلة جدًا';
  end if;

  v_original_fee := coalesce(public.get_setting_numeric('delivery_fee'), 0);
  v_delivery_fee := v_original_fee;

  select * into v_discount from public.customer_discounts
  where is_active = true and customer_id = v_customer_id
    and (expires_at is null or expires_at > now())
  limit 1;

  if v_discount is null then
    select * into v_discount from public.customer_discounts
    where is_active = true and customer_id is null
      and (expires_at is null or expires_at > now())
    limit 1;
  end if;

  if v_discount.id is not null then
    if v_discount.discount_type = 'percentage' then
      v_delivery_fee := greatest(v_delivery_fee - round(v_delivery_fee * v_discount.value / 100.0, 2), 0);
    else
      v_delivery_fee := greatest(v_delivery_fee - v_discount.value, 0);
    end if;
    v_applied_discount_id := v_discount.id;
  end if;

  for v_promo in
    select p.* from public.promotions p
    where p.is_active = true and p.condition_type = 'order_count_window'
      and (
        not exists (select 1 from public.promotion_customers pc where pc.promotion_id = p.id)
        or exists (select 1 from public.promotion_customers pc where pc.promotion_id = p.id and pc.customer_id = v_customer_id)
      )
  loop
    select count(*) into v_recent_orders_count
    from public.orders o
    where o.customer_id = v_customer_id
      and o.created_at > now() - make_interval(hours => (v_promo.condition_config->>'window_hours')::int)
      and o.status not in ('rejected', 'canceled_by_customer', 'canceled_by_business');

    if (v_recent_orders_count + 1) = (v_promo.condition_config->>'count')::int
       and not exists (
         select 1 from public.promotion_redemptions r
         where r.promotion_id = v_promo.id and r.customer_id = v_customer_id
           and r.redeemed_at > now() - make_interval(hours => (v_promo.condition_config->>'window_hours')::int)
       )
    then
      if v_promo.reward_type = 'free_delivery' then
        v_delivery_fee := 0;
      elsif v_promo.reward_type = 'delivery_discount_percent' then
        v_delivery_fee := greatest(v_delivery_fee - round(v_delivery_fee * v_promo.reward_value / 100.0, 2), 0);
      else
        v_delivery_fee := greatest(v_delivery_fee - v_promo.reward_value, 0);
      end if;
      v_applied_promotion_id := v_promo.id;
      exit;
    end if;
  end loop;

  select coalesce(sum(amount), 0) into v_outstanding
  from public.debts where customer_id = v_customer_id and status = 'outstanding';

  insert into public.orders (
    customer_id, status, delivery_address_snapshot, delivery_fee_applied, delivery_fee_original,
    applied_discount_id, applied_promotion_id,
    previous_debt_applied, payment_method, policy_version_accepted, policy_accepted_at
  ) values (
    v_customer_id, 'review', v_address_json, v_delivery_fee, v_original_fee,
    v_applied_discount_id, v_applied_promotion_id,
    v_outstanding, p_payment_method,
    (select version from public.policies where id = p_policy_id), now()
  ) returning id into v_order_id;

  if v_applied_promotion_id is not null then
    insert into public.promotion_redemptions (promotion_id, customer_id, order_id)
    values (v_applied_promotion_id, v_customer_id, v_order_id);
  end if;

  if p_policy_id is not null then
    insert into public.policy_consents (user_id, policy_id, order_id)
    values (v_customer_id, p_policy_id, v_order_id);
  end if;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    if length(coalesce(v_item->>'comment', '')) > 500 or length(coalesce(v_item->>'manual_name', '')) > 200 then
      raise exception 'اسم الصنف أو التعليق طويل جدًا';
    end if;
    if v_item->>'type' is distinct from 'catalog' and length(trim(coalesce(v_item->>'manual_name', ''))) = 0 then
      raise exception 'اسم الصنف مطلوب';
    end if;

    if v_item->>'type' = 'catalog' then
      if (v_item->>'quantity') is null or (v_item->>'quantity')::numeric <= 0 or (v_item->>'quantity')::numeric > 1000 then
        raise exception 'كمية غير صالحة';
      end if;

      select last_known_price into v_displayed_price
      from public.products where id = (v_item->>'product_id')::uuid;

      insert into public.order_items (
        order_id, product_id, item_type, quantity, unit_id,
        customer_comment, displayed_price_snapshot
      ) values (
        v_order_id, (v_item->>'product_id')::uuid, 'catalog',
        (v_item->>'quantity')::numeric, (v_item->>'unit_id')::uuid,
        v_item->>'comment', v_displayed_price
      );
    else
      -- ميزانية بدل كمية/وحدة؟ (العميل قال "بـ150 جنيه" مثلًا بدل "2 كيلو")
      v_target_price := null;
      if (v_item->>'target_price') is not null and length(v_item->>'target_price') > 0 then
        v_target_price := (v_item->>'target_price')::numeric;
        if v_target_price <= 0 or v_target_price > 100000 then
          raise exception 'ميزانية غير صالحة';
        end if;
        v_quantity := null;
        v_unit_id := null;
      else
        if (v_item->>'quantity') is null or (v_item->>'quantity')::numeric <= 0 or (v_item->>'quantity')::numeric > 1000 then
          raise exception 'كمية غير صالحة';
        end if;
        v_quantity := (v_item->>'quantity')::numeric;
        v_unit_id := (v_item->>'unit_id')::uuid;
      end if;

      -- التصنيف المقترح لازم يكون قسم حقيقي فعلاً (مش أي uuid اتبعت)
      v_manual_category_id := null;
      if (v_item->>'category_id') is not null and length(v_item->>'category_id') > 0 then
        select id into v_manual_category_id from public.categories where id = (v_item->>'category_id')::uuid;
      end if;

      -- صورة مرجعية لازم تكون فعلاً من Cloudinary لو موجودة
      v_manual_image_url := nullif(trim(coalesce(v_item->>'image_url', '')), '');
      if v_manual_image_url is not null
         and (length(v_manual_image_url) > 500
              or v_manual_image_url !~ '^https://res\.cloudinary\.com/[A-Za-z0-9_-]+/image/upload/[^[:space:]]+$') then
        v_manual_image_url := null;
      end if;

      insert into public.order_items (
        order_id, product_id, item_type, manual_name, quantity, unit_id, customer_comment,
        manual_category_id, manual_image_url, target_price
      ) values (
        v_order_id, null, 'manual', v_item->>'manual_name',
        v_quantity, v_unit_id, v_item->>'comment',
        v_manual_category_id, v_manual_image_url, v_target_price
      );
    end if;
  end loop;

  insert into public.order_status_history (order_id, from_status, to_status, changed_by)
  values (v_order_id, null, 'review', v_customer_id);

  if p_payment_method <> 'cash' and p_payment_proof_image_url is not null then
    insert into public.payment_proofs (order_id, image_url, sender_name, sender_number)
    values (v_order_id, p_payment_proof_image_url, p_payment_sender_name, p_payment_sender_number);
  end if;

  perform public.fn_log_audit('order.create', 'orders', v_order_id, null,
    jsonb_build_object('customer_id', v_customer_id));

  select order_number into v_new_order_number from public.orders where id = v_order_id;
  perform public.fn_queue_push('new_order_admin', u.id, format('طلب جديد رقم %s بانتظار المراجعة', v_new_order_number))
  from public.users u where u.role in ('business_admin', 'super_admin');

  return v_order_id;
end;
$_$;

CREATE OR REPLACE FUNCTION public."current_role"() RETURNS public.user_role
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select role from public.users where id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.current_user_status() RETURNS public.user_status
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select status from public.users where id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.decline_shopping_assignment(p_order_id uuid, p_reason text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_status public.order_status;
  v_current_agent uuid;
begin
  select status, assigned_agent_id into v_status, v_current_agent
  from public.orders where id = p_order_id for update;

  if v_current_agent is distinct from auth.uid() then
    raise exception 'هذا الطلب غير مُسند إليك';
  end if;

  if v_status not in ('shopping', 'invoice_preparation') then
    raise exception 'لا يمكن رفض الطلب في هذه المرحلة — استخدم نقل الطلب أثناء التوصيل بدل ذلك';
  end if;

  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'يجب كتابة سبب مقنع لرفض الطلب';
  end if;

  insert into public.order_transfers (order_id, from_agent_id, reason)
  values (p_order_id, v_current_agent, p_reason);

  update public.agent_profiles
  set current_active_orders_count = greatest(current_active_orders_count - 1, 0)
  where user_id = v_current_agent;

  update public.orders set assigned_agent_id = null where id = p_order_id;

  perform public.fn_log_audit('order.decline_shopping', 'orders', p_order_id, null, null, p_reason);
end;
$$;

CREATE OR REPLACE FUNCTION public.dismiss_product_request(p_order_item_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if not public.is_admin() then
    raise exception 'صلاحية إدارية فقط';
  end if;

  update public.order_items
  set dismissed_at = now()
  where id = p_order_item_id and item_type = 'manual';
end;
$$;

CREATE OR REPLACE FUNCTION public.fn_create_cancellation_debt(p_customer_id uuid, p_order_id uuid, p_reason public.debt_reason) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_is_percentage boolean;
  v_value         numeric;
  v_base_amount   numeric;
  v_amount        numeric;
begin
  v_is_percentage := coalesce(public.get_setting_bool('cancellation_debt_is_percentage'), false);
  v_value := coalesce(public.get_setting_numeric('cancellation_debt_value'), 0);

  if v_value = 0 then
    return;
  end if;

  if v_is_percentage then
    select grand_total into v_base_amount from public.invoices
    where order_id = p_order_id order by created_at desc limit 1;
    v_amount := round(coalesce(v_base_amount, 0) * v_value / 100.0, 2);
  else
    v_amount := v_value;
  end if;

  if v_amount <= 0 then return; end if;

  insert into public.debts (customer_id, order_id, amount, reason, applied_rate_snapshot, status)
  values (
    p_customer_id, p_order_id, v_amount, p_reason,
    jsonb_build_object('is_percentage', v_is_percentage, 'value', v_value),
    'outstanding'
  );

  perform public.fn_log_audit('debt.create', 'debts', p_order_id, null,
    jsonb_build_object('amount', v_amount, 'reason', p_reason));

  perform public.fn_queue_push('debt_created', p_customer_id, format('تم تسجيل مديونية بقيمة %s ج.م على حسابك', v_amount));
end;
$$;

CREATE OR REPLACE FUNCTION public.fn_ensure_agent_profile() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if new.role in ('delivery_agent', 'business_admin') then
    insert into public.agent_profiles (user_id)
    values (new.id)
    on conflict (user_id) do nothing;
  elsif old.role is not null and old.role in ('delivery_agent', 'business_admin') and new.role not in ('delivery_agent', 'business_admin') then
    update public.agent_profiles set availability_status = 'offline' where user_id = new.id;
  end if;
  return new;
end;
$$;

CREATE OR REPLACE FUNCTION public.fn_guard_agent_profile_counter() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
begin
  if current_user in ('authenticated', 'anon') and not public.is_admin() then
    if tg_op = 'INSERT' and new.current_active_orders_count <> 0 then
      raise exception 'لا يمكن تعديل هذه البيانات' using errcode = '42501';
    end if;
    if tg_op = 'UPDATE' and new.current_active_orders_count is distinct from old.current_active_orders_count then
      raise exception 'لا يمكن تعديل هذه البيانات' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

CREATE OR REPLACE FUNCTION public.fn_guard_user_protected_columns() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
begin
  if current_user in ('authenticated', 'anon') and not public.is_admin() then
    if new.role is distinct from old.role
       or new.status is distinct from old.status
       or new.phone is distinct from old.phone then
      raise exception 'لا يمكن تعديل هذه البيانات' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

CREATE OR REPLACE FUNCTION public.fn_log_audit(p_action text, p_entity_type text, p_entity_id uuid, p_old_value jsonb DEFAULT NULL::jsonb, p_new_value jsonb DEFAULT NULL::jsonb, p_reason text DEFAULT NULL::text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  insert into public.audit_log (actor_id, actor_role, action, entity_type, entity_id, old_value, new_value, reason)
  values (auth.uid(), public.current_role(), p_action, p_entity_type, p_entity_id, p_old_value, p_new_value, p_reason);
end;
$$;

CREATE OR REPLACE FUNCTION public.fn_queue_push(p_event_key text, p_recipient_id uuid, p_text text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if p_recipient_id is null then return; end if;
  insert into public.notification_log (event_key, channel, recipient_id, status, payload)
  values (p_event_key, 'push', p_recipient_id, 'prepared', jsonb_build_object('text', p_text));
end;
$$;

CREATE OR REPLACE FUNCTION public.fn_revoke_sessions_on_block() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if old.status = 'active' and new.status <> 'active' then
    perform public.fn_revoke_user_sessions(new.id);
  end if;
  return new;
end;
$$;

CREATE OR REPLACE FUNCTION public.fn_revoke_user_sessions(p_user_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  update public.user_sessions set revoked_at = now() where user_id = p_user_id and revoked_at is null;
  delete from auth.sessions where user_id = p_user_id;
end;
$$;

CREATE OR REPLACE FUNCTION public.fn_set_product_slug() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  if new.slug is null or length(trim(new.slug)) = 0 then
    new.slug := coalesce(public.fn_slugify(new.name), 'منتج') || '-' || substr(new.id::text, 1, 6);
  end if;
  return new;
end;
$$;

CREATE OR REPLACE FUNCTION public.fn_slugify(p_text text) RETURNS text
    LANGUAGE sql IMMUTABLE
    AS $$
  -- بيحافظ على الحروف العربية والإنجليزية والأرقام، ويستبدل أي حاجة تانية
  -- (مسافات، علامات ترقيم) بشرطة، من غير ما يكسر لو الاسم فاضي
  select nullif(
    trim(both '-' from regexp_replace(regexp_replace(trim(p_text), '\s+', '-', 'g'), '[^ء-ي‌آ-ۿ0-9A-Za-z\-]', '', 'g')),
    ''
  )
$$;

CREATE OR REPLACE FUNCTION public.fn_transition_order(p_order_id uuid, p_to_status public.order_status, p_reason text DEFAULT NULL::text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_from public.order_status;
begin
  select status into v_from from public.orders where id = p_order_id for update;

  update public.orders set status = p_to_status where id = p_order_id;

  insert into public.order_status_history (order_id, from_status, to_status, changed_by, reason)
  values (p_order_id, v_from, p_to_status, auth.uid(), p_reason);
end;
$$;

CREATE OR REPLACE FUNCTION public.generate_prepared_message(p_event_key text, p_order_id uuid) RETURNS TABLE(customer_phone text, message_text text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_template   text;
  v_order      record;
  v_customer   record;
  v_final_text text;
begin
  if not (public.is_admin() or public.is_agent()) then
    raise exception 'غير مصرح';
  end if;

  select body_text into v_template from public.whatsapp_templates
  where event_key = p_event_key and is_active = true;
  if v_template is null then
    raise exception 'لا يوجد قالب رسالة نشط لهذا الحدث: %', p_event_key;
  end if;

  select o.*, i.grand_total from public.orders o
  left join public.invoices i on i.order_id = o.id and i.status = 'approved'
  where o.id = p_order_id into v_order;

  if v_order.id is null then
    raise exception 'الطلب غير موجود';
  end if;
  if not public.is_admin() and v_order.assigned_agent_id is distinct from auth.uid() then
    raise exception 'غير مصرح';
  end if;

  select * into v_customer from public.users where id = v_order.customer_id;

  v_final_text := v_template;
  v_final_text := replace(v_final_text, '{{customer_name}}', coalesce(v_customer.full_name, ''));
  v_final_text := replace(v_final_text, '{{order_number}}', coalesce(v_order.order_number, ''));
  v_final_text := replace(v_final_text, '{{grand_total}}', coalesce(v_order.grand_total::text, ''));
  v_final_text := replace(v_final_text, '{{cancellation_reason}}', coalesce(v_order.cancellation_reason, ''));
  v_final_text := replace(v_final_text, '{{rejection_reason}}', coalesce(v_order.rejection_reason, ''));

  insert into public.notification_log (event_key, channel, recipient_id, status, payload)
  values (p_event_key, 'whatsapp_manual', v_order.customer_id, 'prepared',
    jsonb_build_object('text', v_final_text, 'order_id', p_order_id));

  return query select v_customer.phone, v_final_text;
end;
$$;

CREATE OR REPLACE FUNCTION public.get_active_perks() RETURNS TABLE(kind text, label text)
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_customer_id uuid := auth.uid();
  v_discount record;
  v_promo record;
  v_recent_count integer;
begin
  select * into v_discount from public.customer_discounts
  where is_active = true and (customer_id = v_customer_id or customer_id is null)
    and (expires_at is null or expires_at > now())
  order by customer_id nulls last limit 1;

  if v_discount.id is not null then
    return query select 'discount', case when v_discount.discount_type = 'percentage'
      then format('عندك خصم %s%% على رسوم التوصيل', v_discount.value)
      else format('عندك خصم %s ج.م على رسوم التوصيل', v_discount.value) end;
  end if;

  for v_promo in
    select p.* from public.promotions p
    where p.is_active = true and p.condition_type = 'order_count_window'
      and (
        not exists (select 1 from public.promotion_customers pc where pc.promotion_id = p.id)
        or exists (select 1 from public.promotion_customers pc where pc.promotion_id = p.id and pc.customer_id = v_customer_id)
      )
  loop
    select count(*) into v_recent_count
    from public.orders o
    where o.customer_id = v_customer_id
      and o.created_at > now() - make_interval(hours => (v_promo.condition_config->>'window_hours')::int)
      and o.status not in ('rejected', 'canceled_by_customer', 'canceled_by_business');

    if v_recent_count + 1 < (v_promo.condition_config->>'count')::int then
      return query select 'promotion', format(
        'اطلب %s مرة كمان خلال %s ساعة وهيتطبّقلك: %s',
        (v_promo.condition_config->>'count')::int - v_recent_count - 1,
        v_promo.condition_config->>'window_hours',
        v_promo.name
      );
    end if;
  end loop;

  return;
end;
$$;

CREATE OR REPLACE FUNCTION public.get_agent_performance() RETURNS TABLE(agent_id uuid, full_name text, completed_orders bigint, active_orders bigint, avg_rating numeric)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if not public.is_admin() then raise exception 'صلاحية إدارية فقط'; end if;
  return query
  select u.id, u.full_name,
    count(o.id) filter (where o.status = 'delivered'),
    count(o.id) filter (where o.status in ('assigned','on_the_way')),
    round(avg(r.stars)::numeric, 2)
  from public.users u
  left join public.orders o on o.assigned_agent_id = u.id
  left join public.ratings r on r.agent_id = u.id
  where u.role = 'delivery_agent'
  group by u.id, u.full_name;
end;
$$;

CREATE OR REPLACE FUNCTION public.get_business_dashboard() RETURNS TABLE(new_orders bigint, in_progress_orders bigint, ready_orders bigint, on_the_way_orders bigint, completed_orders bigint, canceled_orders bigint)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if not public.is_admin() then raise exception 'صلاحية إدارية فقط'; end if;
  return query
  select
    count(*) filter (where status = 'review'),
    count(*) filter (where status in ('accepted','shopping','invoice_preparation')),
    count(*) filter (where status = 'ready_for_delivery'),
    count(*) filter (where status in ('assigned','on_the_way')),
    count(*) filter (where status = 'delivered'),
    count(*) filter (where status in ('canceled_by_customer','canceled_by_business','rejected'))
  from public.orders;
end;
$$;

CREATE OR REPLACE FUNCTION public.get_financial_summary() RETURNS TABLE(total_sales numeric, outstanding_debts numeric, total_customers bigint, commission_due numeric, commission_paid numeric)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if not public.is_admin() then raise exception 'صلاحية إدارية فقط'; end if;
  return query select
    (select coalesce(sum(grand_total),0) from public.invoices where status = 'approved'),
    (select coalesce(sum(amount),0) from public.debts where status = 'outstanding'),
    (select count(*) from public.users where role = 'customer'),
    -- العمولة التفصيلية Super Admin فقط، Business Admin يرى الإجمالي فقط
    case when public.is_super_admin() then
      (select coalesce(sum(commission_amount),0) from public.commission_ledger where status = 'due')
    else null end,
    case when public.is_super_admin() then
      (select coalesce(sum(commission_amount),0) from public.commission_ledger where status = 'paid')
    else null end;
end;
$$;

CREATE OR REPLACE FUNCTION public.get_popular_products(p_limit integer DEFAULT 8) RETURNS TABLE(product_id uuid, name text, image_url text, last_known_price numeric, unit_id uuid, unit_name text, slug text, times_ordered bigint)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select
    p.id,
    p.name,
    p.image_url,
    p.last_known_price,
    p.sale_unit_id,
    su.name,
    p.slug,
    count(oi.id) as times_ordered
  from public.order_items oi
  join public.orders o on o.id = oi.order_id
  join public.products p on p.id = oi.product_id
  join public.sale_units su on su.id = p.sale_unit_id
  where o.status = 'delivered' and p.status = 'active'
  group by p.id, p.name, p.image_url, p.last_known_price, p.sale_unit_id, su.name, p.slug
  order by times_ordered desc
  limit p_limit;
$$;

CREATE OR REPLACE FUNCTION public.get_setting_bool(p_key text) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select (value #>> '{}')::boolean from public.platform_settings where key = p_key;
$$;

CREATE OR REPLACE FUNCTION public.get_setting_numeric(p_key text) RETURNS numeric
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select (value #>> '{}')::numeric from public.platform_settings where key = p_key;
$$;

CREATE OR REPLACE FUNCTION public.get_setting_text(p_key text) RETURNS text
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select value #>> '{}' from public.platform_settings where key = p_key;
$$;

CREATE OR REPLACE FUNCTION public.get_top_customers(p_limit integer DEFAULT 10) RETURNS TABLE(customer_id uuid, full_name text, phone text, order_count bigint, total_spent numeric)
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if not public.is_admin() then
    raise exception 'صلاحية إدارية فقط';
  end if;

  return query
  select u.id, u.full_name, u.phone,
    count(o.id) filter (where o.status = 'delivered'),
    coalesce(sum(i.grand_total) filter (where o.status = 'delivered' and i.status = 'approved'), 0)
  from public.users u
  join public.orders o on o.customer_id = u.id
  left join public.invoices i on i.order_id = o.id
  where u.role = 'customer'
  group by u.id, u.full_name, u.phone
  order by count(o.id) filter (where o.status = 'delivered') desc
  limit least(greatest(coalesce(p_limit, 10), 1), 100);
end;
$$;

CREATE OR REPLACE FUNCTION public.get_top_products() RETURNS TABLE(product_name text, times_ordered bigint, total_quantity numeric)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if not public.is_admin() then raise exception 'صلاحية إدارية فقط'; end if;
  return query
  select coalesce(p.name, oi.manual_name), count(*), sum(oi.quantity)
  from public.order_items oi
  left join public.products p on p.id = oi.product_id
  join public.orders o on o.id = oi.order_id
  where o.status = 'delivered'
  group by coalesce(p.name, oi.manual_name)
  order by count(*) desc;
end;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_auth_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  insert into public.users (id, phone, full_name, role, status)
  values (
    new.id,
    coalesce(new.phone, new.raw_user_meta_data->>'phone'),
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    'customer',
    'active'
  );

  insert into public.customer_profiles (user_id) values (new.id);

  return new;
end;
$$;

CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean
    LANGUAGE sql STABLE
    AS $$ select public.current_role() in ('super_admin','business_admin'); $$;

CREATE OR REPLACE FUNCTION public.is_agent() RETURNS boolean
    LANGUAGE sql STABLE
    AS $$ select public.current_role() = 'delivery_agent'; $$;

CREATE OR REPLACE FUNCTION public.is_business_admin() RETURNS boolean
    LANGUAGE sql STABLE
    AS $$ select public.current_role() = 'business_admin'; $$;

CREATE OR REPLACE FUNCTION public.is_customer() RETURNS boolean
    LANGUAGE sql STABLE
    AS $$ select public.current_role() = 'customer'; $$;

CREATE OR REPLACE FUNCTION public.is_super_admin() RETURNS boolean
    LANGUAGE sql STABLE
    AS $$ select public.current_role() = 'super_admin'; $$;

CREATE OR REPLACE FUNCTION public.mark_delivered(p_order_id uuid, p_payment_received boolean) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_status public.order_status;
  v_agent  uuid;
  v_invoice_id uuid;
  v_delivery_fee numeric(12,2);
  v_commission_rate numeric(6,4);
  v_customer uuid;
  v_order_number text;
begin
  select status, assigned_agent_id, customer_id, order_number
  into v_status, v_agent, v_customer, v_order_number
  from public.orders where id = p_order_id for update;
  if auth.uid() is null or v_agent is distinct from auth.uid() then raise exception 'هذا الطلب غير مُسند إليك'; end if;
  if v_status <> 'on_the_way' then raise exception 'لا يمكن تأكيد التسليم من هذه الحالة'; end if;

  if not p_payment_received then
    raise exception 'لا يمكن تأكيد التسليم قبل استلام المبلغ من العميل';
  end if;

  update public.orders set delivered_at = now() where id = p_order_id;
  perform public.fn_transition_order(p_order_id, 'delivered');

  select id into v_invoice_id from public.invoices where order_id = p_order_id and status = 'approved';
  if v_invoice_id is not null then
    update public.invoices set payment_status = 'paid' where id = v_invoice_id;
  end if;

  update public.agent_profiles
  set availability_status = 'available', current_active_orders_count = greatest(current_active_orders_count - 1, 0)
  where user_id = v_agent;

  select delivery_fee_applied into v_delivery_fee from public.orders where id = p_order_id;
  v_commission_rate := coalesce(public.get_setting_numeric('commission_rate'), 0);

  -- العمولة على رسوم التوصيل فقط، مش على إجمالي قيمة الفاتورة
  insert into public.commission_ledger (order_id, completed_at, delivery_fee_at_time, commission_rate_applied, commission_amount, status)
  values (
    p_order_id, now(), v_delivery_fee, v_commission_rate,
    round(v_delivery_fee * v_commission_rate, 2),
    'due'
  );

  perform public.fn_log_audit('order.deliver', 'orders', p_order_id);
  perform public.fn_queue_push('delivered', v_customer, format('تم تسليم طلبك رقم %s بنجاح 🎉', v_order_number));
end;
$$;

CREATE OR REPLACE FUNCTION public.mark_product_request_converted(p_order_item_id uuid, p_product_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if not public.is_admin() then
    raise exception 'صلاحية إدارية فقط';
  end if;
  if p_product_id is null then
    raise exception 'لازم تحدد المنتج اللي اتحوّل له الطلب';
  end if;

  update public.order_items
  set converted_product_id = p_product_id
  where id = p_order_item_id and item_type = 'manual';

  perform public.fn_log_audit('product_request.converted', 'order_items', p_order_item_id, null,
    jsonb_build_object('product_id', p_product_id));
end;
$$;

CREATE OR REPLACE FUNCTION public.record_commission_payment(p_amount numeric, p_period_from date, p_period_to date, p_notes text DEFAULT NULL::text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_id uuid;
begin
  if not public.is_super_admin() then raise exception 'صلاحية Super Admin فقط'; end if;
  if p_amount <= 0 then raise exception 'مبلغ غير صحيح'; end if;

  insert into public.commission_payments (amount, period_from, period_to, recorded_by, notes)
  values (p_amount, p_period_from, p_period_to, auth.uid(), p_notes)
  returning id into v_id;

  update public.commission_ledger
  set status = 'paid'
  where status = 'due' and completed_at::date between p_period_from and p_period_to;

  perform public.fn_log_audit('commission.record_payment', 'commission_payments', v_id, null,
    jsonb_build_object('amount', p_amount));

  return v_id;
end;
$$;

CREATE OR REPLACE FUNCTION public.record_item_purchase(p_order_item_id uuid, p_actual_price numeric, p_is_available boolean, p_unavailable_reason text DEFAULT NULL::text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_order_id uuid;
  v_status   public.order_status;
  v_agent_id uuid;
begin
  select oi.order_id, o.status, o.assigned_agent_id
  into v_order_id, v_status, v_agent_id
  from public.order_items oi join public.orders o on o.id = oi.order_id
  where oi.id = p_order_item_id
  for update;

  if v_order_id is null then raise exception 'الصنف غير موجود'; end if;
  if v_status <> 'shopping' then
    raise exception 'لا يمكن تسجيل الشراء إلا أثناء مرحلة الشراء';
  end if;

  if not (public.is_admin() or (public.is_agent() and v_agent_id = auth.uid())) then
    raise exception 'غير مصرح لك بتسجيل هذا الصنف';
  end if;

  if p_is_available and (p_actual_price is null or p_actual_price < 0) then
    raise exception 'يجب إدخال سعر فعلي صحيح للصنف المتوفر';
  end if;

  update public.order_items
  set actual_price = case when p_is_available then p_actual_price else null end,
      is_available = p_is_available,
      unavailable_reason = case when p_is_available then null else p_unavailable_reason end
  where id = p_order_item_id;

  perform public.fn_log_audit('order_item.record_purchase', 'order_items', p_order_item_id,
    null, jsonb_build_object('is_available', p_is_available, 'actual_price', p_actual_price));

  -- TODO (مرحلة الإشعارات): إذا p_is_available = false، توليد إشعار للعميل بالمنتج غير المتوفر
end;
$$;

CREATE OR REPLACE FUNCTION public.record_session(p_device_info text DEFAULT NULL::text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_user_id         uuid := auth.uid();
  v_auth_session_id uuid := nullif(auth.jwt() ->> 'session_id', '')::uuid;
  v_ip              text := nullif(trim(split_part(coalesce(nullif(current_setting('request.headers', true), '')::json ->> 'x-forwarded-for', ''), ',', 1)), '');
begin
  if v_user_id is null then
    raise exception 'غير مصرح';
  end if;

  if v_auth_session_id is not null then
    update public.user_sessions set last_active_at = now()
    where auth_session_id = v_auth_session_id and user_id = v_user_id;
    if found then return; end if;
  elsif exists (
    select 1 from public.user_sessions
    where user_id = v_user_id and created_at > now() - interval '1 minute'
  ) then
    return;
  end if;

  insert into public.user_sessions (user_id, device_info, ip_address, auth_session_id)
  values (v_user_id, left(p_device_info, 300), v_ip, v_auth_session_id)
  on conflict (auth_session_id) where auth_session_id is not null do nothing;
end;
$$;

CREATE OR REPLACE FUNCTION public.reject_order(p_order_id uuid, p_reason text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_status public.order_status;
  v_customer uuid;
  v_order_number text;
begin
  if not public.is_admin() then
    raise exception 'فقط الإدارة تستطيع رفض الطلب';
  end if;
  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'يجب إدخال سبب الرفض';
  end if;

  select status, customer_id, order_number into v_status, v_customer, v_order_number
  from public.orders where id = p_order_id for update;
  if v_status <> 'review' then
    raise exception 'لا يمكن رفض طلب في حالته الحالية: %', v_status;
  end if;

  update public.orders
  set rejection_reason = p_reason, rejected_by = auth.uid(), rejected_at = now()
  where id = p_order_id;

  perform public.fn_transition_order(p_order_id, 'rejected', p_reason);
  perform public.fn_log_audit('order.reject', 'orders', p_order_id, null, null, p_reason);
  perform public.fn_queue_push('order_rejected', v_customer, format('تم رفض طلبك رقم %s', v_order_number));
end;
$$;

CREATE OR REPLACE FUNCTION public.request_password_reset(p_customer_phone text) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'extensions'
    AS $$
declare
  v_user_id uuid;
  v_target_role public.user_role;
  v_raw_token text;
begin
  if not public.is_admin() then raise exception 'صلاحية إدارية فقط'; end if;

  select id, role into v_user_id, v_target_role from public.users where phone = p_customer_phone;
  if v_user_id is null then raise exception 'لا يوجد عميل بهذا الرقم'; end if;

  if v_target_role = 'super_admin' then
    raise exception 'لا يمكن إصدار رابط استرجاع لحساب Super Admin من هنا';
  end if;
  if v_target_role <> 'customer' and not public.is_super_admin() then
    raise exception 'استرجاع كلمة مرور الموظفين صلاحية Super Admin فقط';
  end if;

  update public.password_reset_tokens set used_at = now() where user_id = v_user_id and used_at is null;

  v_raw_token := encode(gen_random_bytes(32), 'hex');

  insert into public.password_reset_tokens (user_id, token_hash, expires_at, created_by)
  values (v_user_id, encode(digest(v_raw_token, 'sha256'), 'hex'), now() + interval '30 minutes', auth.uid());

  perform public.fn_log_audit('password_reset.request', 'users', v_user_id);

  return v_raw_token;
end;
$$;

CREATE OR REPLACE FUNCTION public.review_payment_proof(p_proof_id uuid, p_approve boolean, p_notes text DEFAULT NULL::text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if not public.is_admin() then raise exception 'صلاحية إدارية فقط'; end if;

  update public.payment_proofs
  set status = case when p_approve then 'verified' else 'rejected' end,
      reviewed_by = auth.uid(), reviewed_at = now(), notes = p_notes
  where id = p_proof_id;

  perform public.fn_log_audit(
    case when p_approve then 'payment_proof.verify' else 'payment_proof.reject' end,
    'payment_proofs', p_proof_id, null, null, p_notes
  );
end;
$$;

CREATE OR REPLACE FUNCTION public.revoke_session(p_session_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_user_id         uuid;
  v_auth_session_id uuid;
begin
  if not public.is_super_admin() then
    raise exception 'صلاحية Super Admin فقط';
  end if;

  select user_id, auth_session_id into v_user_id, v_auth_session_id
  from public.user_sessions where id = p_session_id for update;

  if v_user_id is null then
    raise exception 'الجلسة غير موجودة';
  end if;

  update public.user_sessions set revoked_at = now(), revoked_by = auth.uid()
  where id = p_session_id and revoked_at is null;

  if v_auth_session_id is not null then
    delete from auth.sessions where id = v_auth_session_id;
  else
    delete from auth.sessions where user_id = v_user_id;
  end if;

  perform public.fn_log_audit('session.revoke', 'users', v_user_id);
end;
$$;

CREATE OR REPLACE FUNCTION public.search_products(p_query text, p_limit integer DEFAULT 30) RETURNS TABLE(id uuid, name text, image_url text, description text, last_known_price numeric, category_id uuid, category_name text, sale_unit_id uuid, unit_name text, slug text, rank real)
    LANGUAGE sql STABLE
    AS $$
  select
    p.id, p.name, p.image_url, p.description, p.last_known_price,
    p.category_id, c.name as category_name, p.sale_unit_id, su.name as unit_name, p.slug,
    greatest(similarity(p.name, p_query), similarity(coalesce(p.description, ''), p_query) * 0.5) as rank
  from public.products p
  join public.categories c on c.id = p.category_id
  join public.sale_units su on su.id = p.sale_unit_id
  where p.status = 'active'
    and (
      p.name ilike '%' || p_query || '%'
      or p.description ilike '%' || p_query || '%'
      or similarity(p.name, p_query) > 0.15
    )
  order by rank desc, p.name
  limit p_limit;
$$;

CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;

CREATE OR REPLACE FUNCTION public.settle_debt(p_debt_id uuid, p_amount numeric, p_notes text DEFAULT NULL::text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_amount_owed numeric;
  v_already_paid numeric;
  v_new_status public.debt_status;
begin
  if not public.is_admin() then raise exception 'صلاحية إدارية فقط'; end if;
  if p_amount <= 0 then raise exception 'مبلغ غير صحيح'; end if;

  select amount into v_amount_owed from public.debts where id = p_debt_id for update;
  if v_amount_owed is null then raise exception 'الدين غير موجود'; end if;

  select coalesce(sum(amount_paid), 0) into v_already_paid from public.debt_settlements where debt_id = p_debt_id;

  insert into public.debt_settlements (debt_id, amount_paid, settled_by, notes)
  values (p_debt_id, p_amount, auth.uid(), p_notes);

  if (v_already_paid + p_amount) >= v_amount_owed then
    v_new_status := 'settled';
  else
    v_new_status := 'partially_settled';
  end if;

  update public.debts set status = v_new_status where id = p_debt_id;

  perform public.fn_log_audit('debt.settle', 'debts', p_debt_id, null,
    jsonb_build_object('amount_paid', p_amount, 'new_status', v_new_status));
end;
$$;

CREATE OR REPLACE FUNCTION public.start_delivery(p_order_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_status public.order_status;
  v_agent  uuid;
  v_customer uuid;
  v_order_number text;
begin
  select status, assigned_agent_id, customer_id, order_number
  into v_status, v_agent, v_customer, v_order_number
  from public.orders where id = p_order_id for update;
  if auth.uid() is null or v_agent is distinct from auth.uid() then raise exception 'هذا الطلب غير مُسند إليك'; end if;
  if v_status <> 'assigned' then raise exception 'لا يمكن بدء التوصيل من هذه الحالة'; end if;

  perform public.fn_transition_order(p_order_id, 'on_the_way');
  perform public.fn_log_audit('order.start_delivery', 'orders', p_order_id);
  perform public.fn_queue_push('on_the_way', v_customer, format('المندوب في الطريق إليك بطلبك رقم %s', v_order_number));
end;
$$;

CREATE OR REPLACE FUNCTION public.submit_for_invoice(p_order_id uuid) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_status        public.order_status;
  v_agent_id      uuid;
  v_unresolved    integer;
  v_invoice_id    uuid;
  v_items_total   numeric(12,2);
  v_delivery_fee  numeric(12,2);
  v_prev_debt     numeric(12,2);
  v_grand_total   numeric(12,2);
  v_payment_method public.payment_method;
begin
  select status, assigned_agent_id, delivery_fee_applied, previous_debt_applied, payment_method
  into v_status, v_agent_id, v_delivery_fee, v_prev_debt, v_payment_method
  from public.orders where id = p_order_id for update;

  if v_status <> 'shopping' then
    raise exception 'لا يمكن تجهيز الفاتورة إلا من حالة الشراء';
  end if;
  if not (public.is_admin() or (public.is_agent() and v_agent_id = auth.uid())) then
    raise exception 'غير مصرح لك';
  end if;

  select count(*) into v_unresolved
  from public.order_items where order_id = p_order_id and is_available is null;
  if v_unresolved > 0 then
    raise exception 'يوجد % صنف لم يُحسم بعد (متوفر/غير متوفر)', v_unresolved;
  end if;

  -- الأصناف بالميزانية (target_price) كميتها NULL، فالسعر الفعلي بيمثّل
  -- إجمالي الصنف مباشرة (زي ما لو الكمية = 1)، مش سعر للوحدة يتضرب
  select coalesce(sum(actual_price * coalesce(quantity, 1)), 0) into v_items_total
  from public.order_items where order_id = p_order_id and is_available = true;

  v_grand_total := v_items_total + v_delivery_fee + v_prev_debt;

  insert into public.invoices (
    order_id, status, items_total, delivery_fee, previous_debt_included,
    grand_total, payment_method, payment_status
  ) values (
    p_order_id, 'draft', v_items_total, v_delivery_fee, v_prev_debt,
    v_grand_total, v_payment_method, 'unpaid'
  ) returning id into v_invoice_id;

  insert into public.invoice_items (invoice_id, product_name, quantity, unit_name, actual_price, line_total, is_available, product_id, order_item_id)
  select
    v_invoice_id,
    coalesce(p.name, oi.manual_name),
    coalesce(oi.quantity, 1),
    coalesce(su.name, 'بالميزانية المحددة'),
    oi.actual_price,
    case when oi.is_available then oi.actual_price * coalesce(oi.quantity, 1) else 0 end,
    oi.is_available,
    oi.product_id,
    oi.id
  from public.order_items oi
  left join public.products p on p.id = oi.product_id
  left join public.sale_units su on su.id = oi.unit_id
  where oi.order_id = p_order_id;

  perform public.fn_transition_order(p_order_id, 'invoice_preparation');
  perform public.fn_log_audit('invoice.prepare', 'invoices', v_invoice_id, null,
    jsonb_build_object('grand_total', v_grand_total));

  return v_invoice_id;
end;
$$;

CREATE OR REPLACE FUNCTION public.transfer_order(p_order_id uuid, p_reason text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_status public.order_status;
  v_current_agent uuid;
begin
  select status, assigned_agent_id into v_status, v_current_agent from public.orders where id = p_order_id for update;
  if auth.uid() is null or v_current_agent is distinct from auth.uid() then raise exception 'هذا الطلب غير مُسند إليك'; end if;
  if v_status not in ('assigned','on_the_way') then
    raise exception 'لا يمكن نقل الطلب من هذه الحالة';
  end if;
  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'يجب إدخال سبب عدم القدرة على إكمال الطلب';
  end if;

  insert into public.order_transfers (order_id, from_agent_id, reason)
  values (p_order_id, v_current_agent, p_reason);

  update public.agent_profiles
  set availability_status = 'available', current_active_orders_count = greatest(current_active_orders_count - 1, 0)
  where user_id = v_current_agent;

  update public.orders set assigned_agent_id = null where id = p_order_id;
  perform public.fn_transition_order(p_order_id, 'ready_for_delivery', p_reason);

  perform public.fn_log_audit('order.transfer', 'orders', p_order_id, null, null, p_reason);
  -- ملاحظة: التفاصيل هنا محفوظة في order_transfers المرئي لـ Super Admin فقط،
  -- audit_log لا يحتوي اسم المندوب الجديد لاحقًا لضمان عدم كشف تفاصيل النقل

  perform public.assign_next_agent(p_order_id);
end;
$$;

-- =====================================================================
-- ربط إنشاء المستخدم في Supabase Auth بجدول public.users
-- (بيتعامل مع جدول auth.users اللي Supabase نفسه بيوفّره جاهز)
-- =====================================================================
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, phone, full_name, role, status)
  values (
    new.id,
    coalesce(new.phone, new.raw_user_meta_data->>'phone'),
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    'customer',
    'active'
  )
  on conflict (id) do nothing;

  insert into public.customer_profiles (user_id) values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- =====================================================================
-- 8) المُحفّزات (Triggers)
-- =====================================================================

DROP TRIGGER IF EXISTS trg_addresses_updated_at ON public.addresses;
CREATE TRIGGER trg_addresses_updated_at BEFORE UPDATE ON public.addresses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_agent_profiles_guard_counter ON public.agent_profiles;
CREATE TRIGGER trg_agent_profiles_guard_counter BEFORE INSERT OR UPDATE ON public.agent_profiles FOR EACH ROW EXECUTE FUNCTION public.fn_guard_agent_profile_counter();

DROP TRIGGER IF EXISTS trg_agent_profiles_updated_at ON public.agent_profiles;
CREATE TRIGGER trg_agent_profiles_updated_at BEFORE UPDATE ON public.agent_profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_audit_platform_settings ON public.platform_settings;
CREATE TRIGGER trg_audit_platform_settings AFTER INSERT OR UPDATE ON public.platform_settings FOR EACH ROW EXECUTE FUNCTION public.audit_platform_settings();

DROP TRIGGER IF EXISTS trg_categories_updated_at ON public.categories;
CREATE TRIGGER trg_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_ensure_agent_profile ON public.users;
CREATE TRIGGER trg_ensure_agent_profile AFTER INSERT OR UPDATE OF role ON public.users FOR EACH ROW EXECUTE FUNCTION public.fn_ensure_agent_profile();

DROP TRIGGER IF EXISTS trg_orders_updated_at ON public.orders;
CREATE TRIGGER trg_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_product_subcategories_updated_at ON public.product_subcategories;
CREATE TRIGGER trg_product_subcategories_updated_at BEFORE UPDATE ON public.product_subcategories FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_products_updated_at ON public.products;
CREATE TRIGGER trg_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_set_product_slug ON public.products;
CREATE TRIGGER trg_set_product_slug BEFORE INSERT ON public.products FOR EACH ROW EXECUTE FUNCTION public.fn_set_product_slug();

DROP TRIGGER IF EXISTS trg_users_guard_protected_columns ON public.users;
CREATE TRIGGER trg_users_guard_protected_columns BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.fn_guard_user_protected_columns();

DROP TRIGGER IF EXISTS trg_users_revoke_sessions_on_block ON public.users;
CREATE TRIGGER trg_users_revoke_sessions_on_block AFTER UPDATE OF status ON public.users FOR EACH ROW EXECUTE FUNCTION public.fn_revoke_sessions_on_block();

DROP TRIGGER IF EXISTS trg_users_updated_at ON public.users;
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =====================================================================
-- 9) سياسات الأمان (RLS Policies)
-- =====================================================================

DROP POLICY IF EXISTS addresses_owner_all ON public.addresses;
CREATE POLICY addresses_owner_all ON public.addresses USING (((customer_id = auth.uid()) OR public.is_admin())) WITH CHECK (((customer_id = auth.uid()) OR public.is_admin()));

DROP POLICY IF EXISTS agent_profile_admin_insert ON public.agent_profiles;
CREATE POLICY agent_profile_admin_insert ON public.agent_profiles FOR INSERT WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS agent_profile_owner ON public.agent_profiles;
CREATE POLICY agent_profile_owner ON public.agent_profiles FOR SELECT USING (((user_id = auth.uid()) OR public.is_admin()));

DROP POLICY IF EXISTS agent_profile_owner_update ON public.agent_profiles;
CREATE POLICY agent_profile_owner_update ON public.agent_profiles FOR UPDATE USING (((user_id = auth.uid()) OR public.is_admin())) WITH CHECK (((user_id = auth.uid()) OR public.is_admin()));

DROP POLICY IF EXISTS audit_log_select_super_admin ON public.audit_log;
CREATE POLICY audit_log_select_super_admin ON public.audit_log FOR SELECT USING (public.is_super_admin());

DROP POLICY IF EXISTS business_admin_block_customer ON public.users;
CREATE POLICY business_admin_block_customer ON public.users FOR UPDATE USING ((public.is_business_admin() AND (role = 'customer'::public.user_role))) WITH CHECK ((public.is_business_admin() AND (role = 'customer'::public.user_role)));

DROP POLICY IF EXISTS categories_delete_super_admin ON public.categories;
CREATE POLICY categories_delete_super_admin ON public.categories FOR DELETE USING (public.is_super_admin());

DROP POLICY IF EXISTS categories_read_all ON public.categories;
CREATE POLICY categories_read_all ON public.categories FOR SELECT USING (true);

DROP POLICY IF EXISTS categories_update_super_admin ON public.categories;
CREATE POLICY categories_update_super_admin ON public.categories FOR UPDATE USING (public.is_super_admin());

DROP POLICY IF EXISTS categories_write_super_admin ON public.categories;
CREATE POLICY categories_write_super_admin ON public.categories FOR INSERT WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS commission_ledger_super_admin ON public.commission_ledger;
CREATE POLICY commission_ledger_super_admin ON public.commission_ledger FOR SELECT USING (public.is_super_admin());

DROP POLICY IF EXISTS commission_payments_super_admin ON public.commission_payments;
CREATE POLICY commission_payments_super_admin ON public.commission_payments FOR SELECT USING (public.is_super_admin());

DROP POLICY IF EXISTS complaints_insert_customer ON public.complaints;
CREATE POLICY complaints_insert_customer ON public.complaints FOR INSERT WITH CHECK (((customer_id = auth.uid()) AND (status = 'new'::public.complaint_status) AND (resolved_at IS NULL) AND (resolved_by IS NULL) AND (((order_id IS NULL) AND (agent_id IS NULL)) OR (EXISTS ( SELECT 1
   FROM public.orders o
  WHERE ((o.id = complaints.order_id) AND (o.customer_id = auth.uid()) AND (o.status = 'delivered'::public.order_status) AND (NOT (o.assigned_agent_id IS DISTINCT FROM complaints.agent_id))))))));

DROP POLICY IF EXISTS complaints_select_admin ON public.complaints;
CREATE POLICY complaints_select_admin ON public.complaints FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS complaints_select_own ON public.complaints;
CREATE POLICY complaints_select_own ON public.complaints FOR SELECT USING (((customer_id = auth.uid()) OR (agent_id = auth.uid())));

DROP POLICY IF EXISTS complaints_update_admin ON public.complaints;
CREATE POLICY complaints_update_admin ON public.complaints FOR UPDATE USING (public.is_admin());

DROP POLICY IF EXISTS consents_insert_own ON public.policy_consents;
CREATE POLICY consents_insert_own ON public.policy_consents FOR INSERT WITH CHECK ((user_id = auth.uid()));

DROP POLICY IF EXISTS consents_select_own ON public.policy_consents;
CREATE POLICY consents_select_own ON public.policy_consents FOR SELECT USING (((user_id = auth.uid()) OR public.is_admin()));

DROP POLICY IF EXISTS customer_profile_admin_update ON public.customer_profiles;
CREATE POLICY customer_profile_admin_update ON public.customer_profiles FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS customer_profile_owner ON public.customer_profiles;
CREATE POLICY customer_profile_owner ON public.customer_profiles FOR SELECT USING (((user_id = auth.uid()) OR public.is_admin()));

DROP POLICY IF EXISTS debt_settlements_select_admin ON public.debt_settlements;
CREATE POLICY debt_settlements_select_admin ON public.debt_settlements FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS debt_settlements_select_customer ON public.debt_settlements;
CREATE POLICY debt_settlements_select_customer ON public.debt_settlements FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.debts d
  WHERE ((d.id = debt_settlements.debt_id) AND (d.customer_id = auth.uid())))));

DROP POLICY IF EXISTS debts_select_admin ON public.debts;
CREATE POLICY debts_select_admin ON public.debts FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS debts_select_customer ON public.debts;
CREATE POLICY debts_select_customer ON public.debts FOR SELECT USING ((customer_id = auth.uid()));

DROP POLICY IF EXISTS discounts_select_admin ON public.customer_discounts;
CREATE POLICY discounts_select_admin ON public.customer_discounts FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS discounts_write_admin ON public.customer_discounts;
CREATE POLICY discounts_write_admin ON public.customer_discounts USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS invoice_items_select_admin ON public.invoice_items;
CREATE POLICY invoice_items_select_admin ON public.invoice_items FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS invoice_items_select_customer ON public.invoice_items;
CREATE POLICY invoice_items_select_customer ON public.invoice_items FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.invoices i
     JOIN public.orders o ON ((o.id = i.order_id)))
  WHERE ((i.id = invoice_items.invoice_id) AND (o.customer_id = auth.uid())))));

DROP POLICY IF EXISTS invoices_select_admin ON public.invoices;
CREATE POLICY invoices_select_admin ON public.invoices FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS invoices_select_agent ON public.invoices;
CREATE POLICY invoices_select_agent ON public.invoices FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.orders o
  WHERE ((o.id = invoices.order_id) AND (o.assigned_agent_id = auth.uid())))));

DROP POLICY IF EXISTS invoices_select_customer ON public.invoices;
CREATE POLICY invoices_select_customer ON public.invoices FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.orders o
  WHERE ((o.id = invoices.order_id) AND (o.customer_id = auth.uid())))));

DROP POLICY IF EXISTS notification_log_insert_staff ON public.notification_log;
CREATE POLICY notification_log_insert_staff ON public.notification_log FOR INSERT WITH CHECK ((public.is_admin() OR public.is_agent()));

DROP POLICY IF EXISTS notification_log_select_admin ON public.notification_log;
CREATE POLICY notification_log_select_admin ON public.notification_log FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS order_items_select_admin ON public.order_items;
CREATE POLICY order_items_select_admin ON public.order_items FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS order_items_select_agent ON public.order_items;
CREATE POLICY order_items_select_agent ON public.order_items FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.orders o
  WHERE ((o.id = order_items.order_id) AND (o.assigned_agent_id = auth.uid()) AND (o.status = ANY (ARRAY['shopping'::public.order_status, 'invoice_preparation'::public.order_status, 'assigned'::public.order_status, 'on_the_way'::public.order_status, 'delivered'::public.order_status]))))));

DROP POLICY IF EXISTS order_items_select_customer ON public.order_items;
CREATE POLICY order_items_select_customer ON public.order_items FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.orders o
  WHERE ((o.id = order_items.order_id) AND (o.customer_id = auth.uid())))));

DROP POLICY IF EXISTS order_status_history_admin ON public.order_status_history;
CREATE POLICY order_status_history_admin ON public.order_status_history FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS order_status_history_customer ON public.order_status_history;
CREATE POLICY order_status_history_customer ON public.order_status_history FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.orders o
  WHERE ((o.id = order_status_history.order_id) AND (o.customer_id = auth.uid())))));

DROP POLICY IF EXISTS order_transfers_super_admin_only ON public.order_transfers;
CREATE POLICY order_transfers_super_admin_only ON public.order_transfers FOR SELECT USING (public.is_super_admin());

DROP POLICY IF EXISTS orders_select_admin ON public.orders;
CREATE POLICY orders_select_admin ON public.orders FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS orders_select_agent ON public.orders;
CREATE POLICY orders_select_agent ON public.orders FOR SELECT USING (((assigned_agent_id = auth.uid()) AND (status = ANY (ARRAY['shopping'::public.order_status, 'invoice_preparation'::public.order_status, 'invoice_approved'::public.order_status, 'ready_for_delivery'::public.order_status, 'assigned'::public.order_status, 'on_the_way'::public.order_status, 'delivered'::public.order_status]))));

DROP POLICY IF EXISTS orders_select_agent_pool ON public.orders;
CREATE POLICY orders_select_agent_pool ON public.orders FOR SELECT USING ((public.is_agent() AND (assigned_agent_id IS NULL) AND (status = ANY (ARRAY['shopping'::public.order_status, 'ready_for_delivery'::public.order_status]))));

DROP POLICY IF EXISTS orders_select_customer ON public.orders;
CREATE POLICY orders_select_customer ON public.orders FOR SELECT USING ((customer_id = auth.uid()));

DROP POLICY IF EXISTS payment_proofs_select_admin ON public.payment_proofs;
CREATE POLICY payment_proofs_select_admin ON public.payment_proofs FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS payment_proofs_select_customer ON public.payment_proofs;
CREATE POLICY payment_proofs_select_customer ON public.payment_proofs FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.orders o
  WHERE ((o.id = payment_proofs.order_id) AND (o.customer_id = auth.uid())))));

DROP POLICY IF EXISTS payment_proofs_update_admin ON public.payment_proofs;
CREATE POLICY payment_proofs_update_admin ON public.payment_proofs FOR UPDATE USING (public.is_admin());

DROP POLICY IF EXISTS policies_read_all ON public.policies;
CREATE POLICY policies_read_all ON public.policies FOR SELECT USING (true);

DROP POLICY IF EXISTS policies_write_super_admin ON public.policies;
CREATE POLICY policies_write_super_admin ON public.policies FOR INSERT WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS price_history_read_admin_agent ON public.product_price_history;
CREATE POLICY price_history_read_admin_agent ON public.product_price_history FOR SELECT USING ((public.is_admin() OR public.is_agent()));

DROP POLICY IF EXISTS product_subcategories_delete_super_admin ON public.product_subcategories;
CREATE POLICY product_subcategories_delete_super_admin ON public.product_subcategories FOR DELETE USING (public.is_super_admin());

DROP POLICY IF EXISTS product_subcategories_read_all ON public.product_subcategories;
CREATE POLICY product_subcategories_read_all ON public.product_subcategories FOR SELECT USING (true);

DROP POLICY IF EXISTS product_subcategories_update_super_admin ON public.product_subcategories;
CREATE POLICY product_subcategories_update_super_admin ON public.product_subcategories FOR UPDATE USING (public.is_super_admin());

DROP POLICY IF EXISTS product_subcategories_write_super_admin ON public.product_subcategories;
CREATE POLICY product_subcategories_write_super_admin ON public.product_subcategories FOR INSERT WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS products_delete_admin ON public.products;
CREATE POLICY products_delete_admin ON public.products FOR DELETE USING (public.is_admin());

DROP POLICY IF EXISTS products_read_all ON public.products;
CREATE POLICY products_read_all ON public.products FOR SELECT USING (true);

DROP POLICY IF EXISTS products_update_admin ON public.products;
CREATE POLICY products_update_admin ON public.products FOR UPDATE USING (public.is_admin());

DROP POLICY IF EXISTS products_write_admin ON public.products;
CREATE POLICY products_write_admin ON public.products FOR INSERT WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS promotion_customers_admin ON public.promotion_customers;
CREATE POLICY promotion_customers_admin ON public.promotion_customers USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS promotion_redemptions_select_admin ON public.promotion_redemptions;
CREATE POLICY promotion_redemptions_select_admin ON public.promotion_redemptions FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS promotion_redemptions_select_customer ON public.promotion_redemptions;
CREATE POLICY promotion_redemptions_select_customer ON public.promotion_redemptions FOR SELECT USING ((customer_id = auth.uid()));

DROP POLICY IF EXISTS promotions_select_admin ON public.promotions;
CREATE POLICY promotions_select_admin ON public.promotions FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS promotions_write_admin ON public.promotions;
CREATE POLICY promotions_write_admin ON public.promotions USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS push_subs_owner ON public.push_subscriptions;
CREATE POLICY push_subs_owner ON public.push_subscriptions USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));

DROP POLICY IF EXISTS ratings_insert_customer ON public.ratings;
CREATE POLICY ratings_insert_customer ON public.ratings FOR INSERT WITH CHECK (((customer_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.orders o
  WHERE ((o.id = ratings.order_id) AND (o.customer_id = auth.uid()) AND (o.status = 'delivered'::public.order_status) AND (o.assigned_agent_id = ratings.agent_id))))));

DROP POLICY IF EXISTS ratings_select_admin ON public.ratings;
CREATE POLICY ratings_select_admin ON public.ratings FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS ratings_select_own ON public.ratings;
CREATE POLICY ratings_select_own ON public.ratings FOR SELECT USING (((customer_id = auth.uid()) OR (agent_id = auth.uid())));

DROP POLICY IF EXISTS reset_tokens_admin_view ON public.password_reset_tokens;
CREATE POLICY reset_tokens_admin_view ON public.password_reset_tokens FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS sale_units_read_all ON public.sale_units;
CREATE POLICY sale_units_read_all ON public.sale_units FOR SELECT USING (true);

DROP POLICY IF EXISTS sale_units_update_super_admin ON public.sale_units;
CREATE POLICY sale_units_update_super_admin ON public.sale_units FOR UPDATE USING (public.is_super_admin());

DROP POLICY IF EXISTS sale_units_write_super_admin ON public.sale_units;
CREATE POLICY sale_units_write_super_admin ON public.sale_units FOR INSERT WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS sessions_select_own ON public.user_sessions;
CREATE POLICY sessions_select_own ON public.user_sessions FOR SELECT USING (((user_id = auth.uid()) OR public.is_super_admin()));

DROP POLICY IF EXISTS settings_read_public ON public.platform_settings;
CREATE POLICY settings_read_public ON public.platform_settings FOR SELECT USING ((public.is_admin() OR (key <> ALL (ARRAY['commission_rate'::text, 'max_active_orders_per_customer'::text]))));

DROP POLICY IF EXISTS settings_update_super_admin ON public.platform_settings;
CREATE POLICY settings_update_super_admin ON public.platform_settings FOR UPDATE USING (public.is_super_admin());

DROP POLICY IF EXISTS settings_write_super_admin ON public.platform_settings;
CREATE POLICY settings_write_super_admin ON public.platform_settings FOR INSERT WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS templates_read_staff ON public.whatsapp_templates;
CREATE POLICY templates_read_staff ON public.whatsapp_templates FOR SELECT USING ((public.is_admin() OR public.is_agent()));

DROP POLICY IF EXISTS templates_write_super_admin ON public.whatsapp_templates;
CREATE POLICY templates_write_super_admin ON public.whatsapp_templates USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS users_admin_full_access ON public.users;
CREATE POLICY users_admin_full_access ON public.users USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS users_select_agent_by_admin ON public.users;
CREATE POLICY users_select_agent_by_admin ON public.users FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS users_select_self ON public.users;
CREATE POLICY users_select_self ON public.users FOR SELECT USING (((id = auth.uid()) OR public.is_admin()));

DROP POLICY IF EXISTS users_update_self_limited ON public.users;
CREATE POLICY users_update_self_limited ON public.users FOR UPDATE USING ((id = auth.uid())) WITH CHECK (((id = auth.uid()) AND (role = ( SELECT u2.role
   FROM public.users u2
  WHERE (u2.id = auth.uid())))));

-- =====================================================================
-- 10) الصلاحيات (Grants)
-- أولًا: سحب صلاحية التنفيذ من كل الدوال (حتى لو اتشغّل الملف على قاعدة
-- قديمة)، وبعدين منح القايمة المحددة بس تحت. ده اللي بيمنع أي زائر
-- غير مسجّل من استدعاء دوال داخلية بالمفتاح العام.
-- =====================================================================

do $mig$
declare
  fn record;
begin
  for fn in
    select p.oid::regprocedure as signature
    from pg_proc p
    where p.pronamespace = 'public'::regnamespace
      and p.prokind in ('f', 'p')
      and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', fn.signature);
  end loop;
end
$mig$;

-- =====================================================================
-- 10-ب) منح الصلاحيات المحددة
-- =====================================================================

GRANT USAGE ON SCHEMA public TO anon;

GRANT USAGE ON SCHEMA public TO authenticated;

GRANT USAGE ON SCHEMA public TO service_role;

REVOKE ALL ON FUNCTION public.accept_order(p_order_id uuid) FROM PUBLIC;

GRANT ALL ON FUNCTION public.accept_order(p_order_id uuid) TO service_role;

GRANT ALL ON FUNCTION public.accept_order(p_order_id uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_claim_order(p_order_id uuid) FROM PUBLIC;

GRANT ALL ON FUNCTION public.admin_claim_order(p_order_id uuid) TO service_role;

GRANT ALL ON FUNCTION public.admin_claim_order(p_order_id uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.approve_invoice(p_invoice_id uuid) FROM PUBLIC;

GRANT ALL ON FUNCTION public.approve_invoice(p_invoice_id uuid) TO service_role;

GRANT ALL ON FUNCTION public.approve_invoice(p_invoice_id uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.assign_next_agent(p_order_id uuid) FROM PUBLIC;

GRANT ALL ON FUNCTION public.assign_next_agent(p_order_id uuid) TO service_role;

REVOKE ALL ON FUNCTION public.audit_platform_settings() FROM PUBLIC;

GRANT ALL ON FUNCTION public.audit_platform_settings() TO service_role;

REVOKE ALL ON FUNCTION public.cancel_invoice(p_invoice_id uuid, p_reason text) FROM PUBLIC;

GRANT ALL ON FUNCTION public.cancel_invoice(p_invoice_id uuid, p_reason text) TO service_role;

GRANT ALL ON FUNCTION public.cancel_invoice(p_invoice_id uuid, p_reason text) TO authenticated;

REVOKE ALL ON FUNCTION public.cancel_order_by_business(p_order_id uuid, p_reason text, p_is_uncontactable boolean) FROM PUBLIC;

GRANT ALL ON FUNCTION public.cancel_order_by_business(p_order_id uuid, p_reason text, p_is_uncontactable boolean) TO service_role;

GRANT ALL ON FUNCTION public.cancel_order_by_business(p_order_id uuid, p_reason text, p_is_uncontactable boolean) TO authenticated;

REVOKE ALL ON FUNCTION public.cancel_order_by_customer(p_order_id uuid, p_reason text) FROM PUBLIC;

GRANT ALL ON FUNCTION public.cancel_order_by_customer(p_order_id uuid, p_reason text) TO service_role;

GRANT ALL ON FUNCTION public.cancel_order_by_customer(p_order_id uuid, p_reason text) TO authenticated;

REVOKE ALL ON FUNCTION public.claim_order(p_order_id uuid) FROM PUBLIC;

GRANT ALL ON FUNCTION public.claim_order(p_order_id uuid) TO service_role;

GRANT ALL ON FUNCTION public.claim_order(p_order_id uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.confirm_password_reset(p_token text, p_new_password text) FROM PUBLIC;

GRANT ALL ON FUNCTION public.confirm_password_reset(p_token text, p_new_password text) TO service_role;

GRANT ALL ON FUNCTION public.confirm_password_reset(p_token text, p_new_password text) TO anon;

GRANT ALL ON FUNCTION public.confirm_password_reset(p_token text, p_new_password text) TO authenticated;

REVOKE ALL ON FUNCTION public.consume_rate_limit(p_action text) FROM PUBLIC;

GRANT ALL ON FUNCTION public.consume_rate_limit(p_action text) TO service_role;

GRANT ALL ON FUNCTION public.consume_rate_limit(p_action text) TO authenticated;

REVOKE ALL ON FUNCTION public.create_order(p_items jsonb, p_address_id uuid, p_custom_address_text text, p_payment_method public.payment_method, p_policy_id uuid, p_payment_proof_image_url text, p_payment_sender_name text, p_payment_sender_number text) FROM PUBLIC;

GRANT ALL ON FUNCTION public.create_order(p_items jsonb, p_address_id uuid, p_custom_address_text text, p_payment_method public.payment_method, p_policy_id uuid, p_payment_proof_image_url text, p_payment_sender_name text, p_payment_sender_number text) TO service_role;

GRANT ALL ON FUNCTION public.create_order(p_items jsonb, p_address_id uuid, p_custom_address_text text, p_payment_method public.payment_method, p_policy_id uuid, p_payment_proof_image_url text, p_payment_sender_name text, p_payment_sender_number text) TO authenticated;

REVOKE ALL ON FUNCTION public."current_role"() FROM PUBLIC;

GRANT ALL ON FUNCTION public."current_role"() TO service_role;

GRANT ALL ON FUNCTION public."current_role"() TO anon;

GRANT ALL ON FUNCTION public."current_role"() TO authenticated;

REVOKE ALL ON FUNCTION public.current_user_status() FROM PUBLIC;

GRANT ALL ON FUNCTION public.current_user_status() TO service_role;

GRANT ALL ON FUNCTION public.current_user_status() TO anon;

GRANT ALL ON FUNCTION public.current_user_status() TO authenticated;

REVOKE ALL ON FUNCTION public.decline_shopping_assignment(p_order_id uuid, p_reason text) FROM PUBLIC;

GRANT ALL ON FUNCTION public.decline_shopping_assignment(p_order_id uuid, p_reason text) TO service_role;

GRANT ALL ON FUNCTION public.decline_shopping_assignment(p_order_id uuid, p_reason text) TO authenticated;

REVOKE ALL ON FUNCTION public.dismiss_product_request(p_order_item_id uuid) FROM PUBLIC;

GRANT ALL ON FUNCTION public.dismiss_product_request(p_order_item_id uuid) TO service_role;

GRANT ALL ON FUNCTION public.dismiss_product_request(p_order_item_id uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.fn_create_cancellation_debt(p_customer_id uuid, p_order_id uuid, p_reason public.debt_reason) FROM PUBLIC;

GRANT ALL ON FUNCTION public.fn_create_cancellation_debt(p_customer_id uuid, p_order_id uuid, p_reason public.debt_reason) TO service_role;

REVOKE ALL ON FUNCTION public.fn_ensure_agent_profile() FROM PUBLIC;

GRANT ALL ON FUNCTION public.fn_ensure_agent_profile() TO service_role;

REVOKE ALL ON FUNCTION public.fn_guard_agent_profile_counter() FROM PUBLIC;

GRANT ALL ON FUNCTION public.fn_guard_agent_profile_counter() TO service_role;

REVOKE ALL ON FUNCTION public.fn_guard_user_protected_columns() FROM PUBLIC;

GRANT ALL ON FUNCTION public.fn_guard_user_protected_columns() TO service_role;

REVOKE ALL ON FUNCTION public.fn_log_audit(p_action text, p_entity_type text, p_entity_id uuid, p_old_value jsonb, p_new_value jsonb, p_reason text) FROM PUBLIC;

GRANT ALL ON FUNCTION public.fn_log_audit(p_action text, p_entity_type text, p_entity_id uuid, p_old_value jsonb, p_new_value jsonb, p_reason text) TO service_role;

REVOKE ALL ON FUNCTION public.fn_queue_push(p_event_key text, p_recipient_id uuid, p_text text) FROM PUBLIC;

GRANT ALL ON FUNCTION public.fn_queue_push(p_event_key text, p_recipient_id uuid, p_text text) TO service_role;

REVOKE ALL ON FUNCTION public.fn_revoke_sessions_on_block() FROM PUBLIC;

GRANT ALL ON FUNCTION public.fn_revoke_sessions_on_block() TO service_role;

REVOKE ALL ON FUNCTION public.fn_revoke_user_sessions(p_user_id uuid) FROM PUBLIC;

GRANT ALL ON FUNCTION public.fn_revoke_user_sessions(p_user_id uuid) TO service_role;

REVOKE ALL ON FUNCTION public.fn_set_product_slug() FROM PUBLIC;

GRANT ALL ON FUNCTION public.fn_set_product_slug() TO service_role;

REVOKE ALL ON FUNCTION public.fn_slugify(p_text text) FROM PUBLIC;

GRANT ALL ON FUNCTION public.fn_slugify(p_text text) TO service_role;

GRANT ALL ON FUNCTION public.fn_slugify(p_text text) TO anon;

GRANT ALL ON FUNCTION public.fn_slugify(p_text text) TO authenticated;

REVOKE ALL ON FUNCTION public.fn_transition_order(p_order_id uuid, p_to_status public.order_status, p_reason text) FROM PUBLIC;

GRANT ALL ON FUNCTION public.fn_transition_order(p_order_id uuid, p_to_status public.order_status, p_reason text) TO service_role;

REVOKE ALL ON FUNCTION public.generate_prepared_message(p_event_key text, p_order_id uuid) FROM PUBLIC;

GRANT ALL ON FUNCTION public.generate_prepared_message(p_event_key text, p_order_id uuid) TO service_role;

GRANT ALL ON FUNCTION public.generate_prepared_message(p_event_key text, p_order_id uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.get_active_perks() FROM PUBLIC;

GRANT ALL ON FUNCTION public.get_active_perks() TO service_role;

GRANT ALL ON FUNCTION public.get_active_perks() TO anon;

GRANT ALL ON FUNCTION public.get_active_perks() TO authenticated;

REVOKE ALL ON FUNCTION public.get_agent_performance() FROM PUBLIC;

GRANT ALL ON FUNCTION public.get_agent_performance() TO service_role;

GRANT ALL ON FUNCTION public.get_agent_performance() TO authenticated;

REVOKE ALL ON FUNCTION public.get_business_dashboard() FROM PUBLIC;

GRANT ALL ON FUNCTION public.get_business_dashboard() TO service_role;

GRANT ALL ON FUNCTION public.get_business_dashboard() TO authenticated;

REVOKE ALL ON FUNCTION public.get_financial_summary() FROM PUBLIC;

GRANT ALL ON FUNCTION public.get_financial_summary() TO service_role;

GRANT ALL ON FUNCTION public.get_financial_summary() TO authenticated;

REVOKE ALL ON FUNCTION public.get_popular_products(p_limit integer) FROM PUBLIC;

GRANT ALL ON FUNCTION public.get_popular_products(p_limit integer) TO service_role;

GRANT ALL ON FUNCTION public.get_popular_products(p_limit integer) TO anon;

GRANT ALL ON FUNCTION public.get_popular_products(p_limit integer) TO authenticated;

REVOKE ALL ON FUNCTION public.get_setting_bool(p_key text) FROM PUBLIC;

GRANT ALL ON FUNCTION public.get_setting_bool(p_key text) TO service_role;

REVOKE ALL ON FUNCTION public.get_setting_numeric(p_key text) FROM PUBLIC;

GRANT ALL ON FUNCTION public.get_setting_numeric(p_key text) TO service_role;

REVOKE ALL ON FUNCTION public.get_setting_text(p_key text) FROM PUBLIC;

GRANT ALL ON FUNCTION public.get_setting_text(p_key text) TO service_role;

REVOKE ALL ON FUNCTION public.get_top_customers(p_limit integer) FROM PUBLIC;

GRANT ALL ON FUNCTION public.get_top_customers(p_limit integer) TO service_role;

GRANT ALL ON FUNCTION public.get_top_customers(p_limit integer) TO authenticated;

REVOKE ALL ON FUNCTION public.get_top_products() FROM PUBLIC;

GRANT ALL ON FUNCTION public.get_top_products() TO service_role;

GRANT ALL ON FUNCTION public.get_top_products() TO authenticated;

REVOKE ALL ON FUNCTION public.handle_new_auth_user() FROM PUBLIC;

GRANT ALL ON FUNCTION public.handle_new_auth_user() TO service_role;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;

GRANT ALL ON FUNCTION public.is_admin() TO service_role;

GRANT ALL ON FUNCTION public.is_admin() TO anon;

GRANT ALL ON FUNCTION public.is_admin() TO authenticated;

REVOKE ALL ON FUNCTION public.is_agent() FROM PUBLIC;

GRANT ALL ON FUNCTION public.is_agent() TO service_role;

GRANT ALL ON FUNCTION public.is_agent() TO anon;

GRANT ALL ON FUNCTION public.is_agent() TO authenticated;

REVOKE ALL ON FUNCTION public.is_business_admin() FROM PUBLIC;

GRANT ALL ON FUNCTION public.is_business_admin() TO service_role;

GRANT ALL ON FUNCTION public.is_business_admin() TO anon;

GRANT ALL ON FUNCTION public.is_business_admin() TO authenticated;

REVOKE ALL ON FUNCTION public.is_customer() FROM PUBLIC;

GRANT ALL ON FUNCTION public.is_customer() TO service_role;

GRANT ALL ON FUNCTION public.is_customer() TO anon;

GRANT ALL ON FUNCTION public.is_customer() TO authenticated;

REVOKE ALL ON FUNCTION public.is_super_admin() FROM PUBLIC;

GRANT ALL ON FUNCTION public.is_super_admin() TO service_role;

GRANT ALL ON FUNCTION public.is_super_admin() TO anon;

GRANT ALL ON FUNCTION public.is_super_admin() TO authenticated;

REVOKE ALL ON FUNCTION public.mark_delivered(p_order_id uuid, p_payment_received boolean) FROM PUBLIC;

GRANT ALL ON FUNCTION public.mark_delivered(p_order_id uuid, p_payment_received boolean) TO service_role;

GRANT ALL ON FUNCTION public.mark_delivered(p_order_id uuid, p_payment_received boolean) TO authenticated;

REVOKE ALL ON FUNCTION public.mark_product_request_converted(p_order_item_id uuid, p_product_id uuid) FROM PUBLIC;

GRANT ALL ON FUNCTION public.mark_product_request_converted(p_order_item_id uuid, p_product_id uuid) TO service_role;

GRANT ALL ON FUNCTION public.mark_product_request_converted(p_order_item_id uuid, p_product_id uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.record_commission_payment(p_amount numeric, p_period_from date, p_period_to date, p_notes text) FROM PUBLIC;

GRANT ALL ON FUNCTION public.record_commission_payment(p_amount numeric, p_period_from date, p_period_to date, p_notes text) TO service_role;

GRANT ALL ON FUNCTION public.record_commission_payment(p_amount numeric, p_period_from date, p_period_to date, p_notes text) TO authenticated;

REVOKE ALL ON FUNCTION public.record_item_purchase(p_order_item_id uuid, p_actual_price numeric, p_is_available boolean, p_unavailable_reason text) FROM PUBLIC;

GRANT ALL ON FUNCTION public.record_item_purchase(p_order_item_id uuid, p_actual_price numeric, p_is_available boolean, p_unavailable_reason text) TO service_role;

GRANT ALL ON FUNCTION public.record_item_purchase(p_order_item_id uuid, p_actual_price numeric, p_is_available boolean, p_unavailable_reason text) TO authenticated;

REVOKE ALL ON FUNCTION public.record_session(p_device_info text) FROM PUBLIC;

GRANT ALL ON FUNCTION public.record_session(p_device_info text) TO service_role;

GRANT ALL ON FUNCTION public.record_session(p_device_info text) TO authenticated;

REVOKE ALL ON FUNCTION public.reject_order(p_order_id uuid, p_reason text) FROM PUBLIC;

GRANT ALL ON FUNCTION public.reject_order(p_order_id uuid, p_reason text) TO service_role;

GRANT ALL ON FUNCTION public.reject_order(p_order_id uuid, p_reason text) TO authenticated;

REVOKE ALL ON FUNCTION public.request_password_reset(p_customer_phone text) FROM PUBLIC;

GRANT ALL ON FUNCTION public.request_password_reset(p_customer_phone text) TO service_role;

GRANT ALL ON FUNCTION public.request_password_reset(p_customer_phone text) TO authenticated;

REVOKE ALL ON FUNCTION public.review_payment_proof(p_proof_id uuid, p_approve boolean, p_notes text) FROM PUBLIC;

GRANT ALL ON FUNCTION public.review_payment_proof(p_proof_id uuid, p_approve boolean, p_notes text) TO service_role;

GRANT ALL ON FUNCTION public.review_payment_proof(p_proof_id uuid, p_approve boolean, p_notes text) TO authenticated;

REVOKE ALL ON FUNCTION public.revoke_session(p_session_id uuid) FROM PUBLIC;

GRANT ALL ON FUNCTION public.revoke_session(p_session_id uuid) TO service_role;

GRANT ALL ON FUNCTION public.revoke_session(p_session_id uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.search_products(p_query text, p_limit integer) FROM PUBLIC;

GRANT ALL ON FUNCTION public.search_products(p_query text, p_limit integer) TO service_role;

GRANT ALL ON FUNCTION public.search_products(p_query text, p_limit integer) TO anon;

GRANT ALL ON FUNCTION public.search_products(p_query text, p_limit integer) TO authenticated;

REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC;

GRANT ALL ON FUNCTION public.set_updated_at() TO service_role;

REVOKE ALL ON FUNCTION public.settle_debt(p_debt_id uuid, p_amount numeric, p_notes text) FROM PUBLIC;

GRANT ALL ON FUNCTION public.settle_debt(p_debt_id uuid, p_amount numeric, p_notes text) TO service_role;

GRANT ALL ON FUNCTION public.settle_debt(p_debt_id uuid, p_amount numeric, p_notes text) TO authenticated;

REVOKE ALL ON FUNCTION public.start_delivery(p_order_id uuid) FROM PUBLIC;

GRANT ALL ON FUNCTION public.start_delivery(p_order_id uuid) TO service_role;

GRANT ALL ON FUNCTION public.start_delivery(p_order_id uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.submit_for_invoice(p_order_id uuid) FROM PUBLIC;

GRANT ALL ON FUNCTION public.submit_for_invoice(p_order_id uuid) TO service_role;

GRANT ALL ON FUNCTION public.submit_for_invoice(p_order_id uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.transfer_order(p_order_id uuid, p_reason text) FROM PUBLIC;

GRANT ALL ON FUNCTION public.transfer_order(p_order_id uuid, p_reason text) TO service_role;

GRANT ALL ON FUNCTION public.transfer_order(p_order_id uuid, p_reason text) TO authenticated;

GRANT ALL ON TABLE public.addresses TO anon;

GRANT ALL ON TABLE public.addresses TO authenticated;

GRANT ALL ON TABLE public.addresses TO service_role;

GRANT ALL ON TABLE public.agent_profiles TO anon;

GRANT ALL ON TABLE public.agent_profiles TO authenticated;

GRANT ALL ON TABLE public.agent_profiles TO service_role;

GRANT ALL ON TABLE public.audit_log TO anon;

GRANT ALL ON TABLE public.audit_log TO authenticated;

GRANT ALL ON TABLE public.audit_log TO service_role;

GRANT ALL ON TABLE public.categories TO anon;

GRANT ALL ON TABLE public.categories TO authenticated;

GRANT ALL ON TABLE public.categories TO service_role;

GRANT ALL ON TABLE public.commission_ledger TO anon;

GRANT ALL ON TABLE public.commission_ledger TO authenticated;

GRANT ALL ON TABLE public.commission_ledger TO service_role;

GRANT ALL ON TABLE public.commission_payments TO anon;

GRANT ALL ON TABLE public.commission_payments TO authenticated;

GRANT ALL ON TABLE public.commission_payments TO service_role;

GRANT ALL ON TABLE public.complaints TO anon;

GRANT ALL ON TABLE public.complaints TO authenticated;

GRANT ALL ON TABLE public.complaints TO service_role;

GRANT ALL ON TABLE public.customer_discounts TO anon;

GRANT ALL ON TABLE public.customer_discounts TO authenticated;

GRANT ALL ON TABLE public.customer_discounts TO service_role;

GRANT ALL ON TABLE public.customer_profiles TO anon;

GRANT ALL ON TABLE public.customer_profiles TO authenticated;

GRANT ALL ON TABLE public.customer_profiles TO service_role;

GRANT ALL ON TABLE public.debt_settlements TO anon;

GRANT ALL ON TABLE public.debt_settlements TO authenticated;

GRANT ALL ON TABLE public.debt_settlements TO service_role;

GRANT ALL ON TABLE public.debts TO anon;

GRANT ALL ON TABLE public.debts TO authenticated;

GRANT ALL ON TABLE public.debts TO service_role;

GRANT ALL ON TABLE public.invoice_items TO anon;

GRANT ALL ON TABLE public.invoice_items TO authenticated;

GRANT ALL ON TABLE public.invoice_items TO service_role;

GRANT ALL ON SEQUENCE public.invoice_number_seq TO anon;

GRANT ALL ON SEQUENCE public.invoice_number_seq TO authenticated;

GRANT ALL ON SEQUENCE public.invoice_number_seq TO service_role;

GRANT ALL ON TABLE public.invoices TO anon;

GRANT ALL ON TABLE public.invoices TO authenticated;

GRANT ALL ON TABLE public.invoices TO service_role;

GRANT ALL ON TABLE public.notification_log TO anon;

GRANT ALL ON TABLE public.notification_log TO authenticated;

GRANT ALL ON TABLE public.notification_log TO service_role;

GRANT ALL ON TABLE public.order_items TO anon;

GRANT ALL ON TABLE public.order_items TO authenticated;

GRANT ALL ON TABLE public.order_items TO service_role;

GRANT ALL ON SEQUENCE public.order_number_seq TO anon;

GRANT ALL ON SEQUENCE public.order_number_seq TO authenticated;

GRANT ALL ON SEQUENCE public.order_number_seq TO service_role;

GRANT ALL ON TABLE public.order_status_history TO anon;

GRANT ALL ON TABLE public.order_status_history TO authenticated;

GRANT ALL ON TABLE public.order_status_history TO service_role;

GRANT ALL ON TABLE public.order_transfers TO anon;

GRANT ALL ON TABLE public.order_transfers TO authenticated;

GRANT ALL ON TABLE public.order_transfers TO service_role;

GRANT ALL ON TABLE public.orders TO anon;

GRANT ALL ON TABLE public.orders TO authenticated;

GRANT ALL ON TABLE public.orders TO service_role;

GRANT ALL ON TABLE public.password_reset_tokens TO anon;

GRANT ALL ON TABLE public.password_reset_tokens TO authenticated;

GRANT ALL ON TABLE public.password_reset_tokens TO service_role;

GRANT ALL ON TABLE public.payment_proofs TO anon;

GRANT ALL ON TABLE public.payment_proofs TO authenticated;

GRANT ALL ON TABLE public.payment_proofs TO service_role;

GRANT ALL ON TABLE public.platform_settings TO anon;

GRANT ALL ON TABLE public.platform_settings TO authenticated;

GRANT ALL ON TABLE public.platform_settings TO service_role;

GRANT ALL ON TABLE public.policies TO anon;

GRANT ALL ON TABLE public.policies TO authenticated;

GRANT ALL ON TABLE public.policies TO service_role;

GRANT ALL ON TABLE public.policy_consents TO anon;

GRANT ALL ON TABLE public.policy_consents TO authenticated;

GRANT ALL ON TABLE public.policy_consents TO service_role;

GRANT ALL ON TABLE public.product_price_history TO anon;

GRANT ALL ON TABLE public.product_price_history TO authenticated;

GRANT ALL ON TABLE public.product_price_history TO service_role;

GRANT ALL ON TABLE public.product_subcategories TO anon;

GRANT ALL ON TABLE public.product_subcategories TO authenticated;

GRANT ALL ON TABLE public.product_subcategories TO service_role;

GRANT ALL ON TABLE public.products TO anon;

GRANT ALL ON TABLE public.products TO authenticated;

GRANT ALL ON TABLE public.products TO service_role;

GRANT ALL ON TABLE public.promotion_customers TO anon;

GRANT ALL ON TABLE public.promotion_customers TO authenticated;

GRANT ALL ON TABLE public.promotion_customers TO service_role;

GRANT ALL ON TABLE public.promotion_redemptions TO anon;

GRANT ALL ON TABLE public.promotion_redemptions TO authenticated;

GRANT ALL ON TABLE public.promotion_redemptions TO service_role;

GRANT ALL ON TABLE public.promotions TO anon;

GRANT ALL ON TABLE public.promotions TO authenticated;

GRANT ALL ON TABLE public.promotions TO service_role;

GRANT ALL ON TABLE public.push_subscriptions TO anon;

GRANT ALL ON TABLE public.push_subscriptions TO authenticated;

GRANT ALL ON TABLE public.push_subscriptions TO service_role;

GRANT ALL ON TABLE public.rate_limits TO anon;

GRANT ALL ON TABLE public.rate_limits TO authenticated;

GRANT ALL ON TABLE public.rate_limits TO service_role;

GRANT ALL ON TABLE public.ratings TO anon;

GRANT ALL ON TABLE public.ratings TO authenticated;

GRANT ALL ON TABLE public.ratings TO service_role;

GRANT ALL ON TABLE public.sale_units TO anon;

GRANT ALL ON TABLE public.sale_units TO authenticated;

GRANT ALL ON TABLE public.sale_units TO service_role;

GRANT ALL ON TABLE public.user_sessions TO anon;

GRANT ALL ON TABLE public.user_sessions TO authenticated;

GRANT ALL ON TABLE public.user_sessions TO service_role;

GRANT ALL ON TABLE public.users TO anon;

GRANT ALL ON TABLE public.users TO authenticated;

GRANT ALL ON TABLE public.users TO service_role;

GRANT ALL ON TABLE public.whatsapp_templates TO anon;

GRANT ALL ON TABLE public.whatsapp_templates TO authenticated;

GRANT ALL ON TABLE public.whatsapp_templates TO service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO service_role;

-- =====================================================================
-- ربط الجداول بـ Realtime (الـ publication supabase_realtime موجودة
-- بالفعل جاهزة في أي مشروع Supabase)
-- =====================================================================
do $mig$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'orders'
  ) then
    alter publication supabase_realtime add table public.orders;
  end if;
end
$mig$;
do $mig$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'products'
  ) then
    alter publication supabase_realtime add table public.products;
  end if;
end
$mig$;
do $mig$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'categories'
  ) then
    alter publication supabase_realtime add table public.categories;
  end if;
end
$mig$;
do $mig$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'product_subcategories'
  ) then
    alter publication supabase_realtime add table public.product_subcategories;
  end if;
end
$mig$;
do $mig$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'order_items'
  ) then
    alter publication supabase_realtime add table public.order_items;
  end if;
end
$mig$;
do $mig$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'invoices'
  ) then
    alter publication supabase_realtime add table public.invoices;
  end if;
end
$mig$;
do $mig$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'users'
  ) then
    alter publication supabase_realtime add table public.users;
  end if;
end
$mig$;
do $mig$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'agent_profiles'
  ) then
    alter publication supabase_realtime add table public.agent_profiles;
  end if;
end
$mig$;
do $mig$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'complaints'
  ) then
    alter publication supabase_realtime add table public.complaints;
  end if;
end
$mig$;
do $mig$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'customer_discounts'
  ) then
    alter publication supabase_realtime add table public.customer_discounts;
  end if;
end
$mig$;
do $mig$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'promotions'
  ) then
    alter publication supabase_realtime add table public.promotions;
  end if;
end
$mig$;
do $mig$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'debts'
  ) then
    alter publication supabase_realtime add table public.debts;
  end if;
end
$mig$;
do $mig$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'commission_ledger'
  ) then
    alter publication supabase_realtime add table public.commission_ledger;
  end if;
end
$mig$;
do $mig$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'payment_proofs'
  ) then
    alter publication supabase_realtime add table public.payment_proofs;
  end if;
end
$mig$;
do $mig$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'user_sessions'
  ) then
    alter publication supabase_realtime add table public.user_sessions;
  end if;
end
$mig$;
-- =====================================================================
-- 11) تعليقات توثيقية
-- =====================================================================

COMMENT ON TABLE public.audit_log IS 'Append-only بشكل صارم — لا توجد أي سياسة UPDATE أو DELETE على هذا الجدول لأي دور';

COMMENT ON TABLE public.commission_payments IS 'تسجيل يدوي فقط: تم استلام العمولة عبر تحويل — بدون أي تكامل بنكي تقني';

COMMENT ON TABLE public.customer_discounts IS 'خصم على رسوم التوصيل — عام (customer_id=null) أو لعميل محدد. يُطبَّق تلقائيًا في create_order';

COMMENT ON TABLE public.invoice_items IS 'Snapshot مجمّد تمامًا بعد اعتماد الفاتورة — منفصل عن order_items القابل للتحديث أثناء التنفيذ';

COMMENT ON TABLE public.order_transfers IS 'مرئي فقط لـ Super Admin عبر Audit Log — لا يظهر للمندوب الجديد ولا للعميل';

COMMENT ON COLUMN public.orders.delivery_address_snapshot IS 'نسخة كاملة (JSON) من عنوان التسليم وقت إنشاء الطلب — لا يتأثر بتعديل عنوان العميل لاحقًا';

COMMENT ON TABLE public.password_reset_tokens IS 'رابط استعادة كلمة المرور يُرسل يدويًا عبر واتساب المندوب/الإداري (Click-to-Chat) — صفر تكلفة';

COMMENT ON TABLE public.payment_proofs IS 'إثبات تحويل يدوي (Screenshot) — تحقق بشري من الإدارة، وليس بوابة دفع فعلية';

COMMENT ON TABLE public.platform_settings IS 'كل الإعدادات القابلة للتغيير من لوحة التحكم. القيم الافتراضية المتفق عليها تُدرج في seed منفصل (0 لكل من الرسوم/العمولة/مديونية الإلغاء)';

COMMENT ON TABLE public.product_price_history IS 'append-only: كل سعر فعلي مُعتمد يُضاف هنا فقط ولا يُعدَّل أو يُحذف';

COMMENT ON TABLE public.users IS 'الهوية الأساسية لكل مستخدم في النظام بجميع الأدوار الأربعة';
