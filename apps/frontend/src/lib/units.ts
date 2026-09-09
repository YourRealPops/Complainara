import { apiFetch } from "./api";

export type Unit = {
  id: string;
  name: string;
  orgId: string;
};

export function getUnits() {
  return apiFetch<Unit[]>("/units");
}

export function createUnit(data: { name: string }) {
  return apiFetch<Unit>("/units", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateUnit(id: string, data: { name: string }) {
  return apiFetch<Unit>(`/units/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteUnit(id: string) {
  return apiFetch<void>(`/units/${id}`, { method: "DELETE" });
}
