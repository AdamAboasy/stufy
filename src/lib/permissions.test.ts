import assert from "node:assert/strict";
import test from "node:test";
import { hasPermission } from "./permissions.ts";

test("students receive only student permissions and no administrative permissions", () => {
  assert.equal(hasPermission("student", "dashboard:read"), true);
  assert.equal(hasPermission("student", "materials:manage"), true);
  assert.equal(hasPermission("student", "roles:manage"), false);
  assert.equal(hasPermission("student", "activity-logs:read"), false);
});

test("Super Admin permissions and anonymous role checks are explicit", () => {
  assert.equal(hasPermission("super_admin", "roles:manage"), true);
  assert.equal(hasPermission("super_admin", "students:read"), true);
  assert.equal(hasPermission(null, "dashboard:read"), false);
});
