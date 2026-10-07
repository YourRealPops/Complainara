"use client";

import { useEffect, useState } from "react";
import { getUsers, type User } from "@/lib/users";
import { assignComplaint, type Complaint } from "@/lib/complaints";
import { ApiError } from "@/lib/api";

/**
 * ORG_ADMIN only (the endpoint enforces this server-side too).
 * Pick a resolver to assign, or "" to unassign. The parent swaps in the
 * complaint returned by the API, so the timeline/audit entry shows up too.
 */
export function AssignResolverCard({
  complaint,
  onAssigned,
}: {
  complaint: Complaint;
  onAssigned: (updated: Complaint) => void;
}) {
  const [resolvers, setResolvers] = useState<User[]>([]);
  const [loadingResolvers, setLoadingResolvers] = useState(true);
  const [selected, setSelected] = useState(complaint.assignedResolverId ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    getUsers({ role: "RESOLVER" })
      .then(setResolvers)
      .catch((err) =>
        setError(
          err instanceof ApiError
            ? err.message
            : "Failed to load available resolvers.",
        ),
      )
      .finally(() => setLoadingResolvers(false));
  }, []);

  const currentResolverId = complaint.assignedResolverId ?? null;
  const nextResolverId = selected === "" ? null : selected;
  const dirty = currentResolverId !== nextResolverId;

  async function handleAssign() {
    if (!dirty) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const updated = await assignComplaint(complaint.id, nextResolverId);
      onAssigned(updated);
      // Keep the select in sync with the server-confirmed assignment.
      setSelected(updated.assignedResolverId ?? "");
      setNotice(
        nextResolverId === null
          ? "Resolver unassigned."
          : `Assigned to ${updated.assignedResolver?.name ?? "resolver"}.`,
      );
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to update assignment.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-6 rounded-xl border border-line bg-surface p-5">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="font-display text-sm font-bold uppercase tracking-wide text-muted">
          Assigned Resolver
        </h2>
        <span className="font-mono text-xs text-foreground">
          {complaint.assignedResolver?.name ?? "Unassigned"}
        </span>
      </div>

      <p className="mt-2 text-sm text-muted">
        Only the assigned resolver can work on this complaint. Admins can
        reassign it at any time.
      </p>

      <div className="mt-3 flex flex-wrap items-end gap-3">
        <div className="min-w-48 flex-1">
          <label
            htmlFor="assign-resolver"
            className="mb-1 block font-mono text-xs text-muted"
          >
            Resolver
          </label>
          <select
            id="assign-resolver"
            value={selected}
            onChange={(e) => {
              setSelected(e.target.value);
              setNotice("");
            }}
            disabled={loadingResolvers || saving || resolvers.length === 0}
            className="w-full rounded-lg border border-line bg-bg px-3 py-2 font-mono text-sm text-foreground outline-none focus:border-teal/40 disabled:opacity-60"
          >
            <option value="">
              {loadingResolvers
                ? "Loading resolvers…"
                : resolvers.length === 0
                  ? "No resolvers available"
                  : "— Unassigned —"}
            </option>
            {resolvers.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
                {r.unitId ? "" : " (no unit)"}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={handleAssign}
          disabled={!dirty || saving || resolvers.length === 0}
          className="rounded-lg bg-teal px-4 py-2 font-mono text-xs font-medium text-bg transition-colors hover:bg-teal/80 disabled:opacity-50"
        >
          {saving
            ? "Saving…"
            : nextResolverId === null
              ? "Unassign"
              : "Assign"}
        </button>
      </div>

      {notice && (
        <p className="mt-3 font-mono text-xs text-teal">{notice}</p>
      )}
      {error && (
        <p className="mt-3 font-mono text-xs text-stamp">{error}</p>
      )}
    </div>
  );
}
