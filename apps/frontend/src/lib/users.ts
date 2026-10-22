import { apiFetch } from "./api";

export type UserRole =
  | "COMPLAINANT"
  | "RESOLVER"
  | "BRANCH_ADMIN"
  | "ORG_ADMIN"
  | "SUPER_ADMIN";

export type User = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  orgId: string;
  unitId: string | null;
  /** null = HQ user (ORG_ADMIN / SUPER_ADMIN). */
  branchId: string | null;
  createdAt: string;
};

/**
 * Org member list (ORG_ADMIN / SUPER_ADMIN / BRANCH_ADMIN). Optional filters
 * back the assignment dropdown: e.g. { role: "RESOLVER" }.
 */
export function getUsers(
  filters?: { role?: UserRole; unitId?: string; branchId?: string },
) {
  const params = new URLSearchParams();
  if (filters?.role) params.set("role", filters.role);
  if (filters?.unitId) params.set("unitId", filters.unitId);
  if (filters?.branchId) params.set("branchId", filters.branchId);
  const query = params.toString();
  return apiFetch<User[]>(`/users${query ? `?${query}` : ""}`);
}

/**
 * branchId is required by the backend for BRANCH_ADMIN / RESOLVER /
 * COMPLAINANT, ignored (null) for HQ roles, and always forced to the
 * caller's own branch for BRANCH_ADMIN callers.
 */
export function createUser(data: {
  name: string;
  email: string;
  password: string;
  orgId: string;
  role?: UserRole;
  unitId?: string;
  branchId?: string;
}) {
  return apiFetch<User>("/users", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateUserRole(id: string, role: UserRole) {
  return apiFetch<User>(`/users/${id}/role`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });
}
