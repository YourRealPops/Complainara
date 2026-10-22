"use client";

import { useEffect, useState } from "react";
import {
  getUsers,
  createUser,
  updateUserRole,
  type User,
  type UserRole,
} from "@/lib/users";
import { getUnits, type Unit } from "@/lib/units";
import { getSession } from "@/lib/auth-client";
import { ApiError } from "@/lib/api";
import { useBranches } from "@/hooks/useBranches";

/** Roles the create form offers, filtered by who's creating. */
const ALL_ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "COMPLAINANT", label: "Complainant" },
  { value: "RESOLVER", label: "Resolver" },
  { value: "BRANCH_ADMIN", label: "Branch Admin" },
  { value: "ORG_ADMIN", label: "Admin" },
];

// Branch admins can only create foot soldiers (privilege escalation blocked
// server-side) — the UI matches that rule.
const BRANCH_ADMIN_ROLE_OPTIONS: { value: UserRole; label: string }[] =
  ALL_ROLE_OPTIONS.filter(
    (o) => o.value === "COMPLAINANT" || o.value === "RESOLVER",
  );

const ROLE_STYLES: Record<UserRole, string> = {
  COMPLAINANT: "bg-muted/10 text-muted",
  RESOLVER: "bg-teal/10 text-teal",
  BRANCH_ADMIN: "bg-teal/20 text-teal",
  ORG_ADMIN: "bg-stamp/10 text-stamp",
  SUPER_ADMIN: "bg-stamp/20 text-stamp",
};

/** Roles that must live in a branch (backend rejects them without one). */
function roleNeedsBranch(role: UserRole): boolean {
  return role !== "ORG_ADMIN" && role !== "SUPER_ADMIN";
}

export default function UsersPage() {
  const session = getSession();
  const callerRole = session?.role;
  const isAdmin = callerRole === "ORG_ADMIN";
  const canCreate = callerRole === "ORG_ADMIN" || callerRole === "BRANCH_ADMIN";

  const roleOptions =
    callerRole === "BRANCH_ADMIN" ? BRANCH_ADMIN_ROLE_OPTIONS : ALL_ROLE_OPTIONS;

  const {
    branches,
    loading: branchesLoading,
    isMultiBranch,
  } = useBranches();

  const [users, setUsers] = useState<User[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<UserRole>("COMPLAINANT");
  const [newBranchId, setNewBranchId] = useState("");
  const [newUnitId, setNewUnitId] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  async function fetchUsers() {
    try {
      const data = await getUsers();
      setUsers(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load users.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchUsers();
  }, []);

  // Units power the resolver picker — loaded lazily only when the form opens.
  useEffect(() => {
    if (!showCreate || newRole !== "RESOLVER" || units.length > 0) return;
    getUnits()
      .then(setUnits)
      .catch(() => setUnits([]));
  }, [showCreate, newRole, units.length]);

  /**
   * Branch the new user lands in:
   * - BRANCH_ADMIN callers: always their own branch (server enforces too).
   * - HQ roles: none (server nulls it).
   * - ORG_ADMIN in a multi-branch org: whatever they pick.
   * - ORG_ADMIN in a single-site org: the sole (Main) branch, with NO branch
   *   UI shown — a branch role still needs a branch server-side.
   */
  function resolveBranchId(): string | undefined {
    if (callerRole === "BRANCH_ADMIN") return session?.branchId ?? undefined;
    if (!roleNeedsBranch(newRole)) return undefined;
    if (isMultiBranch) return newBranchId || undefined;
    return branches[0]?.id;
  }

  const showBranchSelect =
    isAdmin && isMultiBranch && roleNeedsBranch(newRole);
  const showUnitSelect = newRole === "RESOLVER";

  // Resolver units must belong to the chosen branch (server checks too).
  const targetBranchId = resolveBranchId();
  const unitOptions = units.filter((u) =>
    targetBranchId ? u.branchId === targetBranchId : true,
  );

  const branchSelectRequired = showBranchSelect && !newBranchId;
  // Single-site orgs must know their one branch before a branch role can be
  // created (we auto-assign it) — block submit until it's loaded.
  const awaitingBranch =
    !showBranchSelect &&
    roleNeedsBranch(newRole) &&
    branchesLoading &&
    callerRole === "ORG_ADMIN";

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!session?.orgId) return;
    setCreating(true);
    setCreateError("");
    try {
      const branchId = resolveBranchId();
      const user = await createUser({
        name: newName,
        email: newEmail,
        password: newPassword,
        orgId: session.orgId,
        role: newRole,
        ...(branchId && { branchId }),
        ...(newRole === "RESOLVER" && newUnitId && { unitId: newUnitId }),
      });
      setUsers((prev) => [...prev, user]);
      setNewName("");
      setNewEmail("");
      setNewPassword("");
      setNewRole("COMPLAINANT");
      setNewBranchId("");
      setNewUnitId("");
      setShowCreate(false);
    } catch (err) {
      setCreateError(
        err instanceof ApiError ? err.message : "Failed to create user.",
      );
    } finally {
      setCreating(false);
    }
  }

  async function handleRoleChange(userId: string, nextRole: UserRole) {
    try {
      const updated = await updateUserRole(userId, nextRole);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: updated.role } : u)),
      );
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to update role.",
      );
    }
  }

  const branchName = (id: string | null) =>
    id == null
      ? "—"
      : (branches.find((b) => b.id === id)?.name ?? "—");

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-foreground">
          Users
        </h1>
        {canCreate && !showCreate && (
          <button
            onClick={() => setShowCreate(true)}
            className="rounded-lg bg-teal px-4 py-2 font-mono text-xs font-medium text-bg transition-colors hover:bg-teal/80"
          >
            + Add User
          </button>
        )}
      </div>

      {loading && <p className="mt-6 text-sm text-muted">Loading…</p>}

      {error && (
        <div className="mt-6 rounded-lg border border-stamp/30 bg-stamp/10 px-4 py-3 text-sm text-stamp">
          {error}
        </div>
      )}

      {!loading && !error && users.length === 0 && (
        <p className="mt-6 text-sm text-muted">
          No users found in this organization.
        </p>
      )}

      {/* Create form */}
      {canCreate && showCreate && (
        <form
          onSubmit={handleCreate}
          className="mt-6 rounded-xl border border-line bg-surface p-5"
        >
          <h2 className="font-display text-sm font-bold uppercase tracking-wide text-muted">
            New User
          </h2>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="user-name" className="mb-1 block font-mono text-xs text-muted">
                Name
              </label>
              <input
                id="user-name"
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-foreground placeholder:text-muted/50 outline-none focus:border-teal/40"
              />
            </div>
            <div>
              <label htmlFor="user-email" className="mb-1 block font-mono text-xs text-muted">
                Email
              </label>
              <input
                id="user-email"
                type="email"
                required
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-foreground placeholder:text-muted/50 outline-none focus:border-teal/40"
              />
            </div>
            <div>
              <label htmlFor="user-password" className="mb-1 block font-mono text-xs text-muted">
                Password
              </label>
              <input
                id="user-password"
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-foreground placeholder:text-muted/50 outline-none focus:border-teal/40"
              />
            </div>
            <div>
              <label htmlFor="user-role" className="mb-1 block font-mono text-xs text-muted">
                Role
              </label>
              <select
                id="user-role"
                value={newRole}
                onChange={(e) => {
                  setNewRole(e.target.value as UserRole);
                  setNewUnitId("");
                }}
                className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-foreground outline-none focus:border-teal/40"
              >
                {roleOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Branch select — multi-branch orgs only (never for single-site) */}
            {showBranchSelect && (
              <div>
                <label htmlFor="user-branch" className="mb-1 block font-mono text-xs text-muted">
                  Branch
                </label>
                <select
                  id="user-branch"
                  value={newBranchId}
                  onChange={(e) => {
                    setNewBranchId(e.target.value);
                    setNewUnitId("");
                  }}
                  required
                  disabled={branchesLoading}
                  className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-foreground outline-none focus:border-teal/40"
                >
                  <option value="">Select a branch…</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Resolver unit — must be in the target branch */}
            {showUnitSelect && (
              <div>
                <label htmlFor="user-unit" className="mb-1 block font-mono text-xs text-muted">
                  Unit
                </label>
                <select
                  id="user-unit"
                  value={newUnitId}
                  onChange={(e) => setNewUnitId(e.target.value)}
                  required
                  className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-foreground outline-none focus:border-teal/40"
                >
                  <option value="">Select a unit…</option>
                  {unitOptions.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
                {unitOptions.length === 0 && (
                  <p className="mt-1 font-mono text-[11px] text-stamp">
                    No units in this branch yet — create one first.
                  </p>
                )}
              </div>
            )}
          </div>
          {createError && (
            <p className="mt-2 text-sm text-stamp">{createError}</p>
          )}
          <div className="mt-3 flex gap-2">
            <button
              type="submit"
              disabled={creating || branchSelectRequired || awaitingBranch}
              className="rounded-lg bg-teal px-4 py-2 font-mono text-xs font-medium text-bg transition-colors hover:bg-teal/80 disabled:opacity-50"
            >
              {creating ? "Creating…" : "Create User"}
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="rounded-lg px-4 py-2 font-mono text-xs text-muted transition-colors hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* User list */}
      {!loading && users.length > 0 && (
        <div className="mt-6 flex flex-col gap-2">
          {users.map((user) => (
            <div
              key={user.id}
              className="flex items-center gap-4 rounded-xl border border-line bg-surface px-4 py-3"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal/10 font-mono text-xs font-bold text-teal">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {user.name}
                </p>
                <p className="truncate font-mono text-xs text-muted">
                  {user.email}
                  {/* Branch label only in multi-branch orgs */}
                  {isMultiBranch && user.branchId && (
                    <span className="ml-2 text-teal/70">
                      · {branchName(user.branchId)}
                    </span>
                  )}
                </p>
              </div>
              {isAdmin ? (
                <select
                  value={user.role}
                  onChange={(e) =>
                    handleRoleChange(user.id, e.target.value as UserRole)
                  }
                  className="rounded-lg border border-line bg-bg px-2 py-1.5 font-mono text-xs text-foreground outline-none focus:border-teal/40"
                >
                  {ALL_ROLE_OPTIONS.filter(
                    // You can't demote/promote into a branch-scoped role without
                    // a branch — keep the inline control to safe choices.
                    (o) => o.value !== "BRANCH_ADMIN",
                  ).map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              ) : (
                <span
                  className={`rounded-full px-3 py-1 font-mono text-xs uppercase tracking-wide ${ROLE_STYLES[user.role]}`}
                >
                  {user.role.replace(/_/g, " ")}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
