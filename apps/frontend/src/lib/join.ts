import { apiFetch } from "./api";

export function joinOrganization(data: {
  joinCode: string;
  name: string;
  email: string;
  password: string;
}) {
  return apiFetch<{ accessToken: string }>("/auth/join", {
    method: "POST",
    body: JSON.stringify(data),
  });
}
