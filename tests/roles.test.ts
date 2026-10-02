import { test } from "node:test";
import assert from "node:assert/strict";
import { homeFor, isStaffPath, isStaffRole, pathBelongsToRole } from "@/lib/auth/roles";

test("homeFor maps every staff role and defaults to the public home", () => {
  assert.equal(homeFor("delivery_agent"), "/agent/dashboard");
  assert.equal(homeFor("business_admin"), "/admin/dashboard");
  assert.equal(homeFor("super_admin"), "/admin/dashboard");
  assert.equal(homeFor("customer"), "/home");
  assert.equal(homeFor("unknown"), "/home");
  assert.equal(homeFor(null), "/home");
});

test("only the three staff roles are staff", () => {
  assert.equal(isStaffRole("delivery_agent"), true);
  assert.equal(isStaffRole("business_admin"), true);
  assert.equal(isStaffRole("super_admin"), true);
  assert.equal(isStaffRole("customer"), false);
  assert.equal(isStaffRole(undefined), false);
});

test("staff paths are detected without false positives", () => {
  for (const path of ["/admin", "/admin/orders", "/agent/dashboard", "/super/users"]) assert.equal(isStaffPath(path), true, path);
  for (const path of ["/", "/home", "/order/abc", "/administrator", "/agents-info"]) assert.equal(isStaffPath(path), false, path);
});

test("non-staff roles cannot reach staff areas but can reach public pages", () => {
  for (const path of ["/admin/dashboard", "/admin/orders/1", "/super/users", "/agent/dashboard", "/admin/settings"]) {
    assert.equal(pathBelongsToRole(path, "customer"), false, path);
  }
  assert.equal(pathBelongsToRole("/home", "customer"), true);
});

test("agents only reach agent pages", () => {
  assert.equal(pathBelongsToRole("/agent/orders/1", "delivery_agent"), true);
  assert.equal(pathBelongsToRole("/admin/dashboard", "delivery_agent"), false);
  assert.equal(pathBelongsToRole("/super/audit-log", "delivery_agent"), false);
});

test("business admins reach admin pages except the super-admin-only ones", () => {
  assert.equal(pathBelongsToRole("/admin/orders", "business_admin"), true);
  assert.equal(pathBelongsToRole("/admin/settings", "business_admin"), false);
  assert.equal(pathBelongsToRole("/admin/categories", "business_admin"), false);
  assert.equal(pathBelongsToRole("/admin/reports", "business_admin"), false);
  assert.equal(pathBelongsToRole("/super/users", "business_admin"), false);
  assert.equal(pathBelongsToRole("/agent/dashboard", "business_admin"), false);
});

test("super admins reach admin and super pages", () => {
  for (const path of ["/admin/settings", "/admin/reports", "/admin/categories", "/super/sessions", "/admin/orders"]) {
    assert.equal(pathBelongsToRole(path, "super_admin"), true, path);
  }
});
