import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { useCartStore } from "@/lib/cart-store";

beforeEach(() => {
  useCartStore.getState().clear();
});

test("addItem appends catalog and manual items independently", () => {
  const { addItem } = useCartStore.getState();
  addItem({ key: "a", type: "catalog", productId: "p1", productName: "أرز", displayedPrice: 30, quantity: 2, unitId: "u1", unitName: "كيلو" });
  addItem({ key: "b", type: "manual", manualName: "فراخ بلدي", targetPrice: 150 });

  const items = useCartStore.getState().items;
  assert.equal(items.length, 2);
  assert.equal(items[0].productName, "أرز");
  assert.equal(items[1].manualName, "فراخ بلدي");
  assert.equal(items[1].targetPrice, 150);
});

test("a manual item can carry either targetPrice or quantity+unit, matching the DB constraint shape", () => {
  const { addItem } = useCartStore.getState();
  addItem({ key: "budget", type: "manual", manualName: "صنف بميزانية", targetPrice: 100 });
  addItem({ key: "qty", type: "manual", manualName: "صنف بكمية", quantity: 3, unitId: "u1", unitName: "قطعة" });

  const [budget, qty] = useCartStore.getState().items;
  assert.equal(budget.targetPrice, 100);
  assert.equal(budget.quantity, undefined);
  assert.equal(qty.quantity, 3);
  assert.equal(qty.targetPrice, undefined);
});

test("removeItem removes only the matching key", () => {
  const { addItem, removeItem } = useCartStore.getState();
  addItem({ key: "a", type: "manual", manualName: "1", quantity: 1, unitId: "u", unitName: "قطعة" });
  addItem({ key: "b", type: "manual", manualName: "2", quantity: 1, unitId: "u", unitName: "قطعة" });
  removeItem("a");

  const items = useCartStore.getState().items;
  assert.equal(items.length, 1);
  assert.equal(items[0].key, "b");
});

test("updateQuantity changes only the targeted item and leaves others untouched", () => {
  const { addItem, updateQuantity } = useCartStore.getState();
  addItem({ key: "a", type: "catalog", productId: "p1", quantity: 2, unitId: "u1", unitName: "كيلو" });
  addItem({ key: "b", type: "catalog", productId: "p2", quantity: 5, unitId: "u1", unitName: "كيلو" });
  updateQuantity("a", 4);

  const items = useCartStore.getState().items;
  assert.equal(items.find((i) => i.key === "a")!.quantity, 4);
  assert.equal(items.find((i) => i.key === "b")!.quantity, 5);
});

test("updateQuantity on a budget item (no quantity field) is a no-op that doesn't crash or add one", () => {
  const { addItem, updateQuantity } = useCartStore.getState();
  addItem({ key: "budget", type: "manual", manualName: "صنف", targetPrice: 100 });
  updateQuantity("nonexistent-key", 5);

  const items = useCartStore.getState().items;
  assert.equal(items.length, 1);
  assert.equal(items[0].quantity, undefined);
});

test("clear empties the cart", () => {
  const { addItem, clear } = useCartStore.getState();
  addItem({ key: "a", type: "manual", manualName: "1", quantity: 1, unitId: "u", unitName: "قطعة" });
  clear();
  assert.equal(useCartStore.getState().items.length, 0);
});
