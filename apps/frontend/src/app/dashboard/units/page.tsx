"use client";

import { useEffect, useState } from "react";
import {
  getUnits,
  createUnit,
  updateUnit,
  deleteUnit,
  type Unit,
} from "@/lib/units";
import { getSession } from "@/lib/auth-client";
import { ApiError } from "@/lib/api";
import { useBranches } from "@/hooks/useBranches";

export default function UnitsPage() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [newName, setNewName] = useState("");
  const [newBranchId, setNewBranchId] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editBranchId, setEditBranchId] = useState("");
  const [saving, setSaving] = useState(false);

  const session = getSession();
  const role = session?.role;
  const canManage = role === "ORG_ADMIN" || role === "BRANCH_ADMIN";

  const {
    branches,
    loading: branchesLoading,
    isMultiBranch,
  } = useBranches();

  // ORG_ADMIN picks a branch when multi-site. BRANCH_ADMIN is always locked
  // to their own branch; single-site orgs hide the branch UI entirely.
  const showBranchSelect = isMultiBranch && role === "ORG_ADMIN";

  async function fetchUnits() {
    try {
      const data = await getUnits();
      setUnits(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load units.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchUnits();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError("");
    try {
      const unit = await createUnit({
        name: newName,
        ...(showBranchSelect && newBranchId && { branchId: newBranchId }),
      });
      setUnits((prev) => [...prev, unit]);
      setNewName("");
      setNewBranchId("");
    } catch (err) {
      setCreateError(
        err instanceof ApiError ? err.message : "Failed to create unit.",
      );
    } finally {
      setCreating(false);
    }
  }

  function startEdit(unit: Unit) {
    setEditingId(unit.id);
    setEditName(unit.name);
    setEditBranchId(unit.branchId ?? "");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName("");
    setEditBranchId("");
  }

  async function handleSave(id: string) {
    setSaving(true);
    try {
      const updated = await updateUnit(id, {
        name: editName,
        ...(showBranchSelect && { branchId: editBranchId || undefined }),
      });
      setUnits((prev) => prev.map((u) => (u.id === id ? updated : u)));
      cancelEdit();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update unit.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this unit?")) return;
    try {
      await deleteUnit(id);
      setUnits((prev) => prev.filter((u) => u.id !== id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete unit.");
    }
  }

  const branchName = (id: string | null) =>
    id == null
      ? "Org-wide"
      : (branches.find((b) => b.id === id)?.name ?? "—");

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-foreground">Units</h1>

      {loading && <p className="mt-6 text-sm text-muted">Loading…</p>}

      {error && (
        <div className="mt-6 rounded-lg border border-stamp/30 bg-stamp/10 px-4 py-3 text-sm text-stamp">
          {error}
        </div>
      )}

      {!loading && !error && units.length === 0 && (
        <p className="mt-6 text-sm text-muted">
          No units yet — create one to start routing complaints.
        </p>
      )}

      {/* Create form (ORG_ADMIN / BRANCH_ADMIN) */}
      {canManage && (
        <form onSubmit={handleCreate} className="mt-6 flex items-end gap-3">
          <div className="flex-1">
            <label
              htmlFor="new-unit"
              className="mb-1 block font-mono text-xs text-muted"
            >
              New unit name
            </label>
            <input
              id="new-unit"
              type="text"
              required
              maxLength={100}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Maintenance"
              className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-muted/50 outline-none focus:border-teal/40"
            />
          </div>

          {showBranchSelect && (
            <div className="w-48">
              <label
                htmlFor="new-unit-branch"
                className="mb-1 block font-mono text-xs text-muted"
              >
                Branch
              </label>
              <select
                id="new-unit-branch"
                value={newBranchId}
                onChange={(e) => setNewBranchId(e.target.value)}
                disabled={branchesLoading}
                className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm text-foreground outline-none focus:border-teal/40"
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

          <button
            type="submit"
            disabled={creating || (showBranchSelect && !newBranchId)}
            className="shrink-0 rounded-lg bg-teal px-4 py-2.5 font-mono text-xs font-medium text-bg transition-colors hover:bg-teal/80 disabled:opacity-50"
          >
            {creating ? "Adding…" : "+ Add"}
          </button>
        </form>
      )}

      {createError && (
        <div className="mt-3 rounded-lg border border-stamp/30 bg-stamp/10 px-4 py-3 text-sm text-stamp">
          {createError}
        </div>
      )}

      {/* Unit list */}
      {!loading && units.length > 0 && (
        <div className="mt-6 flex flex-col gap-2">
          {units.map((unit) => (
            <div
              key={unit.id}
              className="flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3"
            >
              {editingId === unit.id ? (
                <>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="flex-1 rounded-lg border border-line bg-bg px-3 py-1.5 text-sm text-foreground outline-none focus:border-teal/40"
                    autoFocus
                  />
                  {showBranchSelect && (
                    <select
                      value={editBranchId}
                      onChange={(e) => setEditBranchId(e.target.value)}
                      className="rounded-lg border border-line bg-bg px-3 py-1.5 text-sm text-foreground outline-none focus:border-teal/40"
                    >
                      <option value="">Org-wide</option>
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  )}
                  <button
                    onClick={() => handleSave(unit.id)}
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
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm text-foreground">
                    {unit.name}
                    {/* Branch label only in multi-branch orgs */}
                    {isMultiBranch && (
                      <span className="ml-2 font-mono text-xs text-muted">
                        · {branchName(unit.branchId)}
                      </span>
                    )}
                  </span>
                  {canManage && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => startEdit(unit)}
                        className="rounded-lg px-3 py-1.5 font-mono text-xs text-muted transition-colors hover:text-foreground"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(unit.id)}
                        className="rounded-lg px-3 py-1.5 font-mono text-xs text-stamp transition-colors hover:text-stamp/80"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
