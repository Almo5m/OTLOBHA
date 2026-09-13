-- =====================================================================
-- 0001_extensions_and_enums.sql
-- مشروع «اطلبها» — المرحلة 1: Schema + RLS
-- =====================================================================

create extension if not exists "pgcrypto";   -- gen_random_uuid()
create extension if not exists "citext";     -- لمقارنة نصوص غير حساسة لحالة الأحرف عند الحاجة

-- ---------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------

create type public.user_role as enum (
  'super_admin',
  'business_admin',
  'delivery_agent',
  'customer'
);

create type public.user_status as enum (
  'active',
  'blocked',
  'suspended'
);

create type public.agent_availability as enum (
  'available',
  'busy',
  'offline'
);

create type public.order_status as enum (
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

create type public.payment_method as enum (
  'cash',
  'wallet',
  'instapay'
);

create type public.payment_status as enum (
  'unpaid',
  'paid'
);

create type public.order_item_type as enum (
  'catalog',
  'manual'
);

create type public.product_status as enum (
  'active',
  'inactive'
);

create type public.invoice_status as enum (
  'draft',
  'approved',
  'canceled'
);

create type public.debt_reason as enum (
  'customer_cancellation',
  'uncontactable',
  'other'
);

create type public.debt_status as enum (
  'outstanding',
  'settled',
  'partially_settled'
);

create type public.complaint_status as enum (
  'new',
  'under_review',
  'resolved',
  'closed'
);

create type public.commission_status as enum (
  'due',
  'paid'
);

create type public.notification_channel as enum (
  'push',
  'whatsapp_manual'
);

create type public.notification_status as enum (
  'prepared',   -- تم توليد النص وفتح رابط الإرسال (واتساب اليدوي)
  'sent',       -- تم الإرسال فعليًا (Push فقط، لأن واتساب لا يمكن تأكيده تقنيًا)
  'failed'
);
