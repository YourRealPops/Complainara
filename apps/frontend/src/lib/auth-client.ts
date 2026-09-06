import { jwtDecode } from "jwt-decode";

export type SessionUser = {
  sub: string;
  orgId: string;
  role: "COMPLAINANT" | "RESOLVER" | "ORG_ADMIN" | "SUPER_ADMIN";
  exp: number;
};

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("accessToken");
}

export function getSession(): SessionUser | null {
  const token = getToken();
  if (!token) return null;

  try {
    const decoded = jwtDecode<SessionUser>(token);
    if (decoded.exp * 1000 < Date.now()) {
      localStorage.removeItem("accessToken");
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

export function logout() {
  localStorage.removeItem("accessToken");
}
