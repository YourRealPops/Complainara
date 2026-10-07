import { apiFetch } from "./api";

export type UserRole = "COMPLAINANT" | "RESOLVER" | "ORG_ADMIN" | "SUPER_ADMIN";

export type User = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  orgId: string;
  unitId: string | null;
  createdAt: string;
};

/**
 * Org member list (ORG_ADMIN / SUPER_ADMIN). Optional filters back the
 * assignment dropdown: e.g. { role: "RESOLVER" }.
 */
export function getUsers(filters?: { role?: UserRole; unitId?: string }) {
  const params = new URLSearchParams();
  if (filters?.role) params.set("role", filters.role);
  if (filters?.unitId) params.set("unitId", filters.unitId);
  const query = params.toString();
  return apiFetch<User[]>(`/users${query ? `?${query}` : ""}`);
}

export function createUser(data: {
  name: string;
  email: string;
  password: string;
  orgId: string;
  role?: UserRole;
  unitId?: string;
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
