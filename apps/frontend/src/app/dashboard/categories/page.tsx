"use client";

import { useEffect, useState } from "react";
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  type Category,
} from "@/lib/categories";
import { getUnits, type Unit } from "@/lib/units";
import { getSession } from "@/lib/auth-client";
import { ApiError } from "@/lib/api";

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Create form
  const [newName, setNewName] = useState("");
  const [newSlaHours, setNewSlaHours] = useState(24);
  const [newUnitId, setNewUnitId] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editSlaHours, setEditSlaHours] = useState(24);
  const [editUnitId, setEditUnitId] = useState("");
  const [saving, setSaving] = useState(false);

  const session = getSession();
  const isAdmin = session?.role === "ORG_ADMIN";

  async function fetchData() {
    try {
      const [cats, unts] = await Promise.all([getCategories(), getUnits()]);
      setCategories(cats);
      setUnits(unts);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to load data.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError("");
    try {
      const cat = await createCategory({
        name: newName,
        slaHours: newSlaHours,
        ...(newUnitId && { defaultUnitId: newUnitId }),
      });
      setCategories((prev) => [...prev, cat]);
      setNewName("");
      setNewSlaHours(24);
      setNewUnitId("");
    } catch (err) {
      setCreateError(
        err instanceof ApiError ? err.message : "Failed to create category.",
      );
    } finally {
      setCreating(false);
    }
  }

  function startEdit(cat: Category) {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditSlaHours(cat.slaHours);
    setEditUnitId(cat.defaultUnitId ?? "");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName("");
    setEditSlaHours(24);
    setEditUnitId("");
  }

  async function handleSave(id: string) {
    setSaving(true);
    try {
      await updateCategory(id, {
        name: editName,
        slaHours: editSlaHours,
        defaultUnitId: editUnitId || undefined,
      });
      setCategories((prev) =>
        prev.map((c) =>
          c.id === id
            ? { ...c, name: editName, slaHours: editSlaHours, defaultUnitId: editUnitId || null }
            : c,
        ),
      );
      cancelEdit();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to update category.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this category?")) return;
    try {
      await deleteCategory(id);
      setCategories((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to delete category.",
      );
    }
  }

  function getUnitName(unitId: string | null): string {
    if (!unitId) return "None";
    return units.find((u) => u.id === unitId)?.name ?? "Unknown";
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-foreground">
        Categories
      </h1>

      {loading && <p className="mt-6 text-sm text-muted">Loading…</p>}

      {error && (
        <div className="mt-6 rounded-lg border border-stamp/30 bg-stamp/10 px-4 py-3 text-sm text-stamp">
          {error}
        </div>
      )}

      {!loading && !error && categories.length === 0 && (
        <p className="mt-6 text-sm text-muted">
          No categories yet — create one to start routing complaints.
        </p>
      )}

      {/* Create form (ORG_ADMIN only) */}
      {isAdmin && (
        <form onSubmit={handleCreate} className="mt-6 rounded-xl border border-line bg-surface p-5">
          <h2 className="font-display text-sm font-bold uppercase tracking-wide text-muted">
            New Category
          </h2>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label htmlFor="cat-name" className="mb-1 block font-mono text-xs text-muted">
                Name
              </label>
              <input
                id="cat-name"
                type="text"
                required
                maxLength={100}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Electrical"
                className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-foreground placeholder:text-muted/50 outline-none focus:border-teal/40"
              />
            </div>
            <div>
              <label htmlFor="cat-sla" className="mb-1 block font-mono text-xs text-muted">
                SLA (hours)
              </label>
              <input
                id="cat-sla"
                type="number"
                required
                min={1}
                value={newSlaHours}
                onChange={(e) => setNewSlaHours(Number(e.target.value))}
                className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-foreground outline-none focus:border-teal/40"
              />
            </div>
            <div>
              <label htmlFor="cat-unit" className="mb-1 block font-mono text-xs text-muted">
                Default Unit
              </label>
              <select
                id="cat-unit"
                value={newUnitId}
                onChange={(e) => setNewUnitId(e.target.value)}
                className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-foreground outline-none focus:border-teal/40"
              >
                <option value="">None</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
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
            {creating ? "Adding…" : "+ Add Category"}
          </button>
        </form>
      )}

      {/* Category list */}
      {!loading && categories.length > 0 && (
        <div className="mt-6 flex flex-col gap-2">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="rounded-xl border border-line bg-surface p-4"
            >
              {editingId === cat.id ? (
                <div className="flex flex-col gap-3">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="rounded-lg border border-line bg-bg px-3 py-2 text-sm text-foreground outline-none focus:border-teal/40"
                      placeholder="Name"
                      autoFocus
                    />
                    <input
                      type="number"
                      value={editSlaHours}
                      onChange={(e) => setEditSlaHours(Number(e.target.value))}
                      min={1}
                      className="rounded-lg border border-line bg-bg px-3 py-2 text-sm text-foreground outline-none focus:border-teal/40"
                      placeholder="SLA hours"
                    />
                    <select
                      value={editUnitId}
                      onChange={(e) => setEditUnitId(e.target.value)}
                      className="rounded-lg border border-line bg-bg px-3 py-2 text-sm text-foreground outline-none focus:border-teal/40"
                    >
                      <option value="">No unit</option>
                      {units.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSave(cat.id)}
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
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {cat.name}
                    </p>
                    <p className="mt-0.5 font-mono text-xs text-muted">
                      SLA: {cat.slaHours}h · Unit: {getUnitName(cat.defaultUnitId)}
                    </p>
                  </div>
                  {isAdmin && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => startEdit(cat)}
                        className="rounded-lg px-3 py-1.5 font-mono text-xs text-muted transition-colors hover:text-foreground"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(cat.id)}
                        className="rounded-lg px-3 py-1.5 font-mono text-xs text-stamp transition-colors hover:text-stamp/80"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
