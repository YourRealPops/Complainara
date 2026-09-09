"use client";

import { useEffect, useState } from "react";
import { getUsers, createUser, updateUserRole, type User, type UserRole } from "@/lib/users";
import { getSession } from "@/lib/auth-client";
import { ApiError } from "@/lib/api";

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "COMPLAINANT", label: "Complainant" },
  { value: "RESOLVER", label: "Resolver" },
  { value: "ORG_ADMIN", label: "Admin" },
];

const ROLE_STYLES: Record<UserRole, string> = {
  COMPLAINANT: "bg-muted/10 text-muted",
  RESOLVER: "bg-teal/10 text-teal",
  ORG_ADMIN: "bg-stamp/10 text-stamp",
  SUPER_ADMIN: "bg-stamp/20 text-stamp",
};

export default function UsersPage() {
  const session = getSession();
  const isAdmin = session?.role === "ORG_ADMIN";

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<UserRole>("COMPLAINANT");
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

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!session?.orgId) return;
    setCreating(true);
    setCreateError("");
    try {
      const user = await createUser({
        name: newName,
        email: newEmail,
        password: newPassword,
        orgId: session.orgId,
        role: newRole,
      });
      setUsers((prev) => [...prev, user]);
      setNewName("");
      setNewEmail("");
      setNewPassword("");
      setNewRole("COMPLAINANT");
      setShowCreate(false);
    } catch (err) {
      setCreateError(
        err instanceof ApiError ? err.message : "Failed to create user.",
      );
    } finally {
      setCreating(false);
    }
  }

  async function handleRoleChange(userId: string, newRole: UserRole) {
    try {
      const updated = await updateUserRole(userId, newRole);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: updated.role } : u)),
      );
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to update role.",
      );
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-foreground">
          Users
        </h1>
        {isAdmin && !showCreate && (
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
      {isAdmin && showCreate && (
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
                onChange={(e) => setNewRole(e.target.value as UserRole)}
                className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-foreground outline-none focus:border-teal/40"
              >
                {ROLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {createError && (
            <p className="mt-2 text-sm text-stamp">{createError}</p>
          )}
          <div className="mt-3 flex gap-2">
            <button
              type="submit"
              disabled={creating}
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
                  {ROLE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              ) : (
                <span
                  className={`rounded-full px-3 py-1 font-mono text-xs uppercase tracking-wide ${ROLE_STYLES[user.role]}`}
                >
                  {user.role}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
