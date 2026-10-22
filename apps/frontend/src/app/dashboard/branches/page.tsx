"use client";

import { useEffect, useState } from "react";
import {
  getBranches,
  createBranch,
  updateBranch,
  deleteBranch,
  getBranchJoinCode,
  regenerateBranchJoinCode,
  type Branch,
} from "@/lib/branches";
import { getSession } from "@/lib/auth-client";
import { ApiError } from "@/lib/api";

export default function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [newName, setNewName] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [saving, setSaving] = useState(false);

  const [joinCodes, setJoinCodes] = useState<Record<string, string>>({});

  const session = getSession();
  const isOrgAdmin = session?.role === "ORG_ADMIN";

  async function fetchBranches() {
    try {
      const data = await getBranches();
      setBranches(data);
      // Prime join codes so HQ can copy without an extra click per row.
      const codes: Record<string, string> = {};
      for (const b of data) codes[b.id] = b.joinCode;
      setJoinCodes(codes);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to load branches.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchBranches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError("");
    try {
      const branch = await createBranch({
        name: newName,
        ...(newLocation && { location: newLocation }),
      });
      setBranches((prev) => [...prev, branch]);
      setJoinCodes((prev) => ({ ...prev, [branch.id]: branch.joinCode }));
      setNewName("");
      setNewLocation("");
    } catch (err) {
      setCreateError(
        err instanceof ApiError ? err.message : "Failed to create branch.",
      );
    } finally {
      setCreating(false);
    }
  }

  function startEdit(branch: Branch) {
    setEditingId(branch.id);
    setEditName(branch.name);
    setEditLocation(branch.location ?? "");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName("");
    setEditLocation("");
  }

  async function handleSave(id: string) {
    setSaving(true);
    try {
      const updated = await updateBranch(id, {
        name: editName,
        location: editLocation,
      });
      setBranches((prev) =>
        prev.map((b) => (b.id === id ? { ...b, ...updated } : b)),
      );
      cancelEdit();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to update branch.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(branch: Branch) {
    if (
      !confirm(
        `Delete branch "${branch.name}"? This can't be undone — it must be empty first.`,
      )
    )
      return;
    try {
      await deleteBranch(branch.id);
      setBranches((prev) => prev.filter((b) => b.id !== branch.id));
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to delete branch.",
      );
    }
  }

  async function handleRegenerateJoinCode(id: string) {
    try {
      const { joinCode } = await regenerateBranchJoinCode(id);
      setJoinCodes((prev) => ({ ...prev, [id]: joinCode }));
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to regenerate code.",
      );
    }
  }

  function copyJoinCode(code: string) {
    navigator.clipboard?.writeText(code);
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-foreground">
          Branches
        </h1>
        {isOrgAdmin && (
          <span className="font-mono text-xs text-muted">
            {branches.length} branch{branches.length === 1 ? "" : "es"}
          </span>
        )}
      </div>

      <p className="mt-2 text-sm text-muted">
        Each branch is a separate site with its own join code, units, and
        complaint routing. Members join a branch with its code.
      </p>

      {loading && <p className="mt-6 text-sm text-muted">Loading…</p>}

      {error && (
        <div className="mt-6 rounded-lg border border-stamp/30 bg-stamp/10 px-4 py-3 text-sm text-stamp">
          {error}
        </div>
      )}

      {/* Create form (ORG_ADMIN only) */}
      {isOrgAdmin && (
        <form
          onSubmit={handleCreate}
          className="mt-6 rounded-xl border border-line bg-surface p-5"
        >
          <h2 className="font-display text-sm font-bold uppercase tracking-wide text-muted">
            New Branch
          </h2>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor="branch-name"
                className="mb-1 block font-mono text-xs text-muted"
              >
                Name
              </label>
              <input
                id="branch-name"
                type="text"
                required
                maxLength={100}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. West Wing"
                className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-foreground placeholder:text-muted/50 outline-none focus:border-teal/40"
              />
            </div>
            <div>
              <label
                htmlFor="branch-location"
                className="mb-1 block font-mono text-xs text-muted"
              >
                Location (optional)
              </label>
              <input
                id="branch-location"
                type="text"
                maxLength={200}
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
                placeholder="e.g. Lagos, Nigeria"
                className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-foreground placeholder:text-muted/50 outline-none focus:border-teal/40"
              />
            </div>
          </div>
          {createError && (
            <p className="mt-2 text-sm text-stamp">{createError}</p>
          )}
          <button
            type="submit"
            disabled={creating}
            className="mt-3 rounded-lg bg-teal px-4 py-2 font-mono text-xs font-medium text-bg transition-colors hover:bg-teal/80 disabled:opacity-50"
          >
            {creating ? "Creating…" : "+ Create Branch"}
          </button>
        </form>
      )}

      {/* Branch list */}
      {!loading && branches.length > 0 && (
        <div className="mt-6 flex flex-col gap-2">
          {branches.map((branch) => {
            const isMain = branch.name === "Main";
            return (
              <div
                key={branch.id}
                className="rounded-xl border border-line bg-surface p-4"
              >
                {editingId === branch.id ? (
                  <div className="flex flex-col gap-3">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="rounded-lg border border-line bg-bg px-3 py-2 text-sm text-foreground outline-none focus:border-teal/40"
                        placeholder="Name"
                        autoFocus
                      />
                      <input
                        type="text"
                        value={editLocation}
                        onChange={(e) => setEditLocation(e.target.value)}
                        className="rounded-lg border border-line bg-bg px-3 py-2 text-sm text-foreground outline-none focus:border-teal/40"
                        placeholder="Location"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSave(branch.id)}
                        disabled={saving}
                        className="rounded-lg bg-teal px-3 py-1.5 font-mono text-xs text-bg transition-colors hover:bg-teal/80 disabled:opacity-50"
                      >
                        Save
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="rounded-lg px-3 py-1.5 font-mono text-xs text-muted transition-colors hover:text-foreground"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-foreground">
                            {branch.name}
                          </p>
                          {isMain && (
                            <span className="rounded-full bg-teal/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-teal">
                              Default
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 font-mono text-xs text-muted">
                          {branch.location ?? "No location"}
                          {branch._count && (
                            <>
                              {" · "}
                              {branch._count.users} user
                              {branch._count.users === 1 ? "" : "s"} ·{" "}
                              {branch._count.units} unit
                              {branch._count.units === 1 ? "" : "s"} ·{" "}
                              {branch._count.complaints} complaint
                              {branch._count.complaints === 1 ? "" : "s"}
                            </>
                          )}
                        </p>
                      </div>
                      {isOrgAdmin && (
                        <div className="flex shrink-0 gap-2">
                          <button
                            onClick={() => startEdit(branch)}
                            className="rounded-lg px-3 py-1.5 font-mono text-xs text-muted transition-colors hover:text-foreground"
                          >
                            Edit
                          </button>
                          {!isMain && (
                            <button
                              onClick={() => handleDelete(branch)}
                              className="rounded-lg px-3 py-1.5 font-mono text-xs text-stamp transition-colors hover:text-stamp/80"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Join code */}
                    <div className="flex flex-wrap items-center gap-2 rounded-lg bg-bg px-3 py-2">
                      <span className="font-mono text-[10px] uppercase tracking-wide text-muted">
                        Join code
                      </span>
                      <code className="font-mono text-xs font-bold text-teal">
                        {joinCodes[branch.id] ?? branch.joinCode}
                      </code>
                      <div className="ml-auto flex gap-2">
                        <button
                          onClick={() =>
                            copyJoinCode(joinCodes[branch.id] ?? branch.joinCode)
                          }
                          className="rounded-lg px-2 py-1 font-mono text-[11px] text-muted transition-colors hover:text-foreground"
                        >
                          Copy
                        </button>
                        {isOrgAdmin && (
                          <button
                            onClick={() => handleRegenerateJoinCode(branch.id)}
                            className="rounded-lg px-2 py-1 font-mono text-[11px] text-muted transition-colors hover:text-foreground"
                          >
                            Regenerate
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!loading && !error && branches.length === 0 && (
        <p className="mt-6 text-sm text-muted">No branches yet.</p>
      )}
    </div>
  );
}
