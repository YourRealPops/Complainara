import { jwtDecode } from "jwt-decode";

export type SessionUser = {
  sub: string;
  orgId: string;
  role:
    | "COMPLAINANT"
    | "RESOLVER"
    | "BRANCH_ADMIN"
    | "ORG_ADMIN"
    | "SUPER_ADMIN";
  /**
   * null = HQ (ORG_ADMIN / SUPER_ADMIN). Legacy tokens issued before
   * multi-branch support omit it entirely — normalize a missing value to
   * null (correct for the HQ admins those tokens belong to).
   */
  branchId?: string | null;
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
