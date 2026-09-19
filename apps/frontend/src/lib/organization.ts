import { apiFetch } from "./api";

export function getJoinCode() {
  return apiFetch<{ joinCode: string }>("/organizations/join-code");
}

export function regenerateJoinCode() {
  return apiFetch<{ joinCode: string }>(
    "/organizations/regenerate-join-code",
    { method: "POST" },
  );
}

export function updateOrganizationSettings(data: {
  allowedEmailDomain?: string;
}) {
  return apiFetch<{ allowedEmailDomain: string | null }>(
    "/organizations/settings",
    {
      method: "PATCH",
      body: JSON.stringify(data),
    },
  );
}
