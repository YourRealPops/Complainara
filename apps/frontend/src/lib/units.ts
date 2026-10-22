import { apiFetch } from "./api";

export type Unit = {
  id: string;
  name: string;
  orgId: string;
  /** null = HQ unit (no branch). */
  branchId: string | null;
  /** Included by the list endpoint — used for the branch label. */
  branch?: { id: string; name: string } | null;
};

export function getUnits() {
  return apiFetch<Unit[]>("/units");
}

/**
 * ORG_ADMIN: may set branchId (or omit for an HQ unit). BRANCH_ADMIN: the
 * backend forces their own branch regardless of branchId.
 */
export function createUnit(data: { name: string; branchId?: string }) {
  return apiFetch<Unit>("/units", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateUnit(
  id: string,
  data: { name?: string; branchId?: string },
) {
  return apiFetch<Unit>(`/units/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteUnit(id: string) {
  return apiFetch<void>(`/units/${id}`, { method: "DELETE" });
}
