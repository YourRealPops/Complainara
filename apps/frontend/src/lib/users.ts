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

export function getUsers() {
  return apiFetch<User[]>("/users");
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
