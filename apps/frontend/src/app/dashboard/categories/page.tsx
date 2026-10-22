"use client";

import { useEffect, useState } from "react";
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryRoutes,
  setCategoryRoute,
  removeCategoryRoute,
  type Category,
  type CategoryRoute,
} from "@/lib/categories";
import { getUnits, type Unit } from "@/lib/units";
import { getSession } from "@/lib/auth-client";
import { ApiError } from "@/lib/api";
import { useBranches } from "@/hooks/useBranches";

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Create form (name + SLA only — routing is a separate step)
  const [newName, setNewName] = useState("");
  const [newSlaHours, setNewSlaHours] = useState(24);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editSlaHours, setEditSlaHours] = useState(24);
  const [saving, setSaving] = useState(false);

  // Per-branch routing
  const [routesCatId, setRoutesCatId] = useState<string | null>(null);
  const [routes, setRoutes] = useState<CategoryRoute[]>([]);
  const [routesLoading, setRoutesLoading] = useState(false);
  const [routeError, setRouteError] = useState("");
  const [routeSavingKey, setRouteSavingKey] = useState<string | null>(null);

  const session = getSession();
  const isAdmin = session?.role === "ORG_ADMIN";
  // Routing is an HQ (ORG_ADMIN) policy — hidden from everyone else.
  const canRoute = isAdmin;

  const {
    branches,
    loading: branchesLoading,
    isMultiBranch,
  } = useBranches();

  async function fetchData() {
    try {
      const [cats, unts] = await Promise.all([getCategories(), getUnits()]);
      setCategories(cats);
      setUnits(unts);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load data.");
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
      const cat = await createCategory({ name: newName, slaHours: newSlaHours });
      setCategories((prev) => [...prev, cat]);
      setNewName("");
      setNewSlaHours(24);
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
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName("");
    setEditSlaHours(24);
  }

  async function handleSave(id: string) {
    setSaving(true);
    try {
      const updated = await updateCategory(id, {
        name: editName,
        slaHours: editSlaHours,
      });
      setCategories((prev) =>
        prev.map((c) => (c.id === id ? updated : c)),
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
      if (routesCatId === id) closeRoutes();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to delete category.",
      );
    }
  }

  // ---- Routing panel ----

  function closeRoutes() {
    setRoutesCatId(null);
    setRoutes([]);
    setRouteError("");
  }

  async function openRoutes(catId: string) {
    if (routesCatId === catId) {
      closeRoutes();
      return;
    }
    setRoutesCatId(catId);
    setRoutes([]);
    setRouteError("");
    setRoutesLoading(true);
    try {
      const data = await getCategoryRoutes(catId);
      setRoutes(data);
    } catch (err) {
      setRouteError(
        err instanceof ApiError ? err.message : "Failed to load routes.",
      );
    } finally {
      setRoutesLoading(false);
    }
  }

  function routeFor(branchId: string): CategoryRoute | undefined {
    return routes.find((r) => r.branchId === branchId);
  }

  async function handleRouteChange(
    categoryId: string,
    branchId: string,
    unitId: string,
  ) {
    const key = `${categoryId}:${branchId}`;
    setRouteSavingKey(key);
    setRouteError("");
    try {
      if (!unitId) {
        // Clearing the route — only call delete if one exists.
        if (routeFor(branchId)) {
          await removeCategoryRoute(categoryId, branchId);
          setRoutes((prev) => prev.filter((r) => r.branchId !== branchId));
        }
      } else {
        const updated = await setCategoryRoute(categoryId, {
          branchId,
          unitId,
        });
        setRoutes((prev) => [
          ...prev.filter((r) => r.branchId !== branchId),
          updated,
        ]);
      }
    } catch (err) {
      setRouteError(
        err instanceof ApiError ? err.message : "Failed to update routing.",
      );
    } finally {
      setRouteSavingKey(null);
    }
  }

  const unitsForBranch = (branchId: string) =>
    units.filter((u) => u.branchId === branchId);

  const canManageRouting = canRoute && !branchesLoading;

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
        <form
          onSubmit={handleCreate}
          className="mt-6 rounded-xl border border-line bg-surface p-5"
        >
          <h2 className="font-display text-sm font-bold uppercase tracking-wide text-muted">
            New Category
          </h2>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
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
            <div key={cat.id} className="rounded-xl border border-line bg-surface p-4">
              {editingId === cat.id ? (
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
                      type="number"
                      value={editSlaHours}
                      onChange={(e) => setEditSlaHours(Number(e.target.value))}
                      min={1}
                      className="rounded-lg border border-line bg-bg px-3 py-2 text-sm text-foreground outline-none focus:border-teal/40"
                      placeholder="SLA hours"
                    />
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
                    <p className="text-sm font-medium text-foreground">{cat.name}</p>
                    <p className="mt-0.5 font-mono text-xs text-muted">
                      SLA: {cat.slaHours}h
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {canManageRouting && (
                      <button
                        onClick={() => openRoutes(cat.id)}
                        className={`rounded-lg px-3 py-1.5 font-mono text-xs transition-colors ${
                          routesCatId === cat.id
                            ? "bg-teal/10 text-teal"
                            : "text-muted hover:text-foreground"
                        }`}
                      >
                        {routesCatId === cat.id ? "Hide routing" : "Routing"}
                      </button>
                    )}
                    {isAdmin && (
                      <>
                        <button
                          onClick={() => startEdit(cat)}
                          className="rounded-lg px-3 py-1.5 font-mono text-xs text-muted transition-colors hover:text-foreground"
                        >
                          Edit
                        </button>                      <button
                        onClick={() => handleDelete(cat.id)}
                        className="rounded-lg px-3 py-1.5 font-mono text-xs text-stamp transition-colors hover:text-stamp/80"
                      >
                        Delete
                      </button>
                    </>
                  )}
                  </div>
                </div>
              )}

              {/* Per-branch routing panel */}
              {routesCatId === cat.id && (
                <div className="mt-4 rounded-lg border border-line bg-bg p-4">
                  <h3 className="font-mono text-xs uppercase tracking-wide text-muted">
                    Routing — where complaints of this category go
                  </h3>

                  {routesLoading && (
                    <p className="mt-3 text-sm text-muted">Loading routes…</p>
                  )}

                  {routeError && (
                    <p className="mt-3 text-sm text-stamp">{routeError}</p>
                  )}

                  {!routesLoading && !branchesLoading && (
                    <div className="mt-3 flex flex-col gap-3">
                      {branches.map((branch) => {
                        const route = routeFor(branch.id);
                        const branchUnits = unitsForBranch(branch.id);
                        const saving =
                          routeSavingKey === `${cat.id}:${branch.id}`;
                        return (
                          <div
                            key={branch.id}
                            className="flex flex-wrap items-center gap-3"
                          >
                            {/* Branch name hidden for single-site orgs */}
                            {isMultiBranch && (
                              <span className="w-40 shrink-0 truncate text-sm text-foreground">
                                {branch.name}
                              </span>
                            )}
                            <select
                              value={route?.unitId ?? ""}
                              onChange={(e) =>
                                handleRouteChange(
                                  cat.id,
                                  branch.id,
                                  e.target.value,
                                )
                              }
                              disabled={saving}
                              className={`min-w-48 rounded-lg border border-line bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-teal/40 ${
                                saving ? "opacity-60" : ""
                              }`}
                            >
                              <option value="">— No routing —</option>
                              {branchUnits.map((u) => (
                                <option key={u.id} value={u.id}>
                                  {u.name}
                                </option>
                              ))}
                            </select>
                            {branchUnits.length === 0 && (
                              <span className="font-mono text-[11px] text-muted">
                                No units in this branch yet
                              </span>
                            )}
                          </div>
                        );
                      })}

                      {branches.length === 0 && (
                        <p className="text-sm text-muted">No branches found.</p>
                      )}
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
