"use client";

import { useState } from "react";
import type { ComplaintStatus } from "@/lib/complaints";

const STATUS_LABELS: Record<ComplaintStatus, string> = {
  SUBMITTED: "Submitted",
  ACKNOWLEDGED: "Acknowledged",
  IN_PROGRESS: "In Progress",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
  ESCALATED: "Escalated",
};

export function StatusChangeForm({
  currentStatus,
  validTransitions,
  onStatusChange,
  disabled,
}: {
  currentStatus: ComplaintStatus;
  validTransitions: ComplaintStatus[];
  onStatusChange: (status: ComplaintStatus, note?: string) => Promise<void>;
  disabled: boolean;
}) {
  const [selectedStatus, setSelectedStatus] = useState<ComplaintStatus>(
    validTransitions[0],
  );
  const [note, setNote] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await onStatusChange(selectedStatus, note || undefined);
    setNote("");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-line bg-surface p-5"
    >
      <h2 className="font-display text-sm font-bold uppercase tracking-wide text-muted">
        Change Status
      </h2>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <select
          value={selectedStatus}
          onChange={(e) =>
            setSelectedStatus(e.target.value as ComplaintStatus)
          }
          disabled={disabled}
          className="rounded-lg border border-line bg-bg px-3 py-2 text-sm text-foreground outline-none focus:border-teal/40"
        >
          {validTransitions.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status]}
            </option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Optional note…"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          disabled={disabled}
          className="flex-1 rounded-lg border border-line bg-bg px-3 py-2 text-sm text-foreground placeholder:text-muted/50 outline-none focus:border-teal/40"
        />

        <button
          type="submit"
          disabled={disabled}
          className="rounded-lg bg-teal px-4 py-2 font-mono text-xs font-medium text-bg transition-colors hover:bg-teal/80 disabled:opacity-50"
        >
          {disabled ? "Updating…" : "Update"}
        </button>
      </div>
    </form>
  );
}
