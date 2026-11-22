import type { Role } from "./types";

export type Permission =
  | "dashboard:read"
  | "profile:manage"
  | "materials:manage"
  | "lessons:manage"
  | "study-plan:manage"
  | "students:read"
  | "students:manage"
  | "roles:manage"
  | "activation-codes:manage"
  | "subscriptions:manage"
  | "devices:manage"
  | "system:read"
  | "platform-settings:manage"
  | "activity-logs:read"
  | "content:manage";

const ROLE_PERMISSIONS: Record<Role, ReadonlySet<Permission>> = {
  student: new Set([
    "dashboard:read",
    "profile:manage",
    "materials:manage",
    "lessons:manage",
    "study-plan:manage",
  ]),
  super_admin: new Set([
    "dashboard:read",
    "profile:manage",
    "materials:manage",
    "lessons:manage",
    "study-plan:manage",
    "students:read",
    "students:manage",
    "roles:manage",
    "activation-codes:manage",
    "subscriptions:manage",
    "devices:manage",
    "system:read",
    "platform-settings:manage",
    "activity-logs:read",
    "content:manage",
  ]),
};

export function hasPermission(role: Role | null | undefined, permission: Permission): boolean {
  return Boolean(role && ROLE_PERMISSIONS[role]?.has(permission));
}

export function isSuperAdmin(role: Role | null | undefined): role is "super_admin" {
  return role === "super_admin";
}
