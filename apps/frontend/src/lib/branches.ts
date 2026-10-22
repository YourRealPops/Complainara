import { apiFetch } from "./api";

export type Branch = {
  id: string;
  orgId: string;
  name: string;
  location: string | null;
  joinCode: string;
  createdAt: string;
  _count?: { users: number; units: number; complaints: number };
};

/** ORG_ADMIN sees all branches; BRANCH_ADMIN sees only their own. */
export function getBranches() {
  return apiFetch<Branch[]>("/branches");
}

export function createBranch(data: { name: string; location?: string }) {
  return apiFetch<Branch>("/branches", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateBranch(
  id: string,
  data: { name?: string; location?: string },
) {
  return apiFetch<Branch>(`/branches/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

/** 400 if it's the Main branch; 409 if it still has users/units/complaints. */
export function deleteBranch(id: string) {
  return apiFetch<void>(`/branches/${id}`, { method: "DELETE" });
}

export function getBranchJoinCode(id: string) {
  return apiFetch<{ joinCode: string }>(`/branches/${id}/join-code`);
}

export function regenerateBranchJoinCode(id: string) {
  return apiFetch<{ joinCode: string }>(
    `/branches/${id}/regenerate-join-code`,
    { method: "POST" },
  );
}
