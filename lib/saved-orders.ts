"use client";

// آخر طلبات العميل على الجهاز ده (عشان يلاقيها من غير حساب). مصدر الحقيقة
// الرابط الخاص (token) اللي اتبعت له على واتساب — ده مجرد اختصار على نفس الجهاز.
const KEY = "mg_orders";
const MAX = 20;

export type SavedOrder = { token: string; number: string; createdAt: string };

export function readSavedOrders(): SavedOrder[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    if (!Array.isArray(raw)) return [];
    return raw.filter((o) => o && typeof o.token === "string" && o.token.length === 64);
  } catch {
    return [];
  }
}

export function saveOrder(order: SavedOrder) {
  try {
    const next = [order, ...readSavedOrders().filter((o) => o.token !== order.token)].slice(0, MAX);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // التخزين غير متاح (وضع خاص مثلًا) — مش مشكلة، الرابط على واتساب كافي
  }
}
