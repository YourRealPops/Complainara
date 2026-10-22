import { apiFetch } from "./api";

export type Category = {
  id: string;
  name: string;
  slaHours: number;
  orgId: string;
};

/** A (category, branch) -> unit routing rule. */
export type CategoryRoute = {
  id: string;
  categoryId: string;
  branchId: string;
  unitId: string;
  branch?: { id: string; name: string };
  unit?: { id: string; name: string };
};

export function getCategories() {
  return apiFetch<Category[]>("/categories");
}

/**
 * Create takes name + SLA only — routing is a separate per-branch step
 * (setCategoryRoute). The backend rejects a defaultUnitId property.
 */
export function createCategory(data: { name: string; slaHours: number }) {
  return apiFetch<Category>("/categories", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateCategory(
  id: string,
  data: { name?: string; slaHours?: number },
) {
  return apiFetch<Category>(`/categories/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteCategory(id: string) {
  return apiFetch<void>(`/categories/${id}`, { method: "DELETE" });
}

// ---- Per-branch routing (ORG_ADMIN) ----

export function getCategoryRoutes(categoryId: string) {
  return apiFetch<CategoryRoute[]>(`/categories/${categoryId}/routes`);
}

/** Upserts the unit this category routes to within a branch. */
export function setCategoryRoute(
  categoryId: string,
  data: { branchId: string; unitId: string },
) {
  return apiFetch<CategoryRoute>(`/categories/${categoryId}/routes`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function removeCategoryRoute(categoryId: string, branchId: string) {
  return apiFetch<void>(`/categories/${categoryId}/routes/${branchId}`, {
    method: "DELETE",
  });
}
