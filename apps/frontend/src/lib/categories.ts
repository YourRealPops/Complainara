import { apiFetch } from "./api";

export type Category = {
  id: string;
  name: string;
  slaHours: number;
  defaultUnitId: string | null;
  orgId: string;
};

export function getCategories() {
  return apiFetch<Category[]>("/categories");
}

export function createCategory(data: {
  name: string;
  slaHours: number;
  defaultUnitId?: string;
}) {
  return apiFetch<Category>("/categories", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateCategory(
  id: string,
  data: { name?: string; slaHours?: number; defaultUnitId?: string },
) {
  return apiFetch<Category>(`/categories/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteCategory(id: string) {
  return apiFetch<void>(`/categories/${id}`, { method: "DELETE" });
}
