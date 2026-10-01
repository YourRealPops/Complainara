"use client";

import { useState } from "react";
import type { ComplaintStatus } from "@/lib/complaints";
import { TRANSITIONS_REQUIRING_NOTE } from "@/lib/complaints";

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
  const [pickedStatus, setPickedStatus] = useState<ComplaintStatus | null>(null);
  const [note, setNote] = useState("");

  // Derived from props so a stale selection can never be submitted after the
  // complaint's status (and thus validTransitions) changes mid-session.
  const selectedStatus =
    pickedStatus && validTransitions.includes(pickedStatus)
      ? pickedStatus
      : validTransitions[0];

  const noteRequired = selectedStatus
    ? TRANSITIONS_REQUIRING_NOTE.includes(selectedStatus)
    : false;
  const noteMissing = noteRequired && note.trim().length === 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (noteMissing) return;
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

      {/* One button per transition that is actually valid from the current status */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {validTransitions.map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setPickedStatus(status)}
            disabled={disabled}
            aria-pressed={selectedStatus === status}
            className={`rounded-full border px-4 py-1.5 font-mono text-xs transition-colors disabled:opacity-50 ${
              selectedStatus === status
                ? "border-teal/40 bg-teal/15 text-teal"
                : "border-line text-muted hover:bg-bg hover:text-foreground"
            }`}
          >
            → {STATUS_LABELS[status]}
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder={
            noteRequired ? "What was done to fix this? (required)…" : "Optional note…"
          }
          value={note}
          onChange={(e) => setNote(e.target.value)}
          disabled={disabled}
          className="flex-1 rounded-lg border border-line bg-bg px-3 py-2 text-sm text-foreground placeholder:text-muted/50 outline-none focus:border-teal/40"
        />

        <button
          type="submit"
          disabled={disabled || noteMissing}
          className="rounded-lg bg-teal px-4 py-2 font-mono text-xs font-medium text-bg transition-colors hover:bg-teal/80 disabled:opacity-50"
        >
          {disabled ? "Updating…" : "Update"}
        </button>
      </div>

      {noteRequired && (
        <p className="mt-2 font-mono text-xs text-muted">
          A note is required for this transition — it becomes the resolution
          summary the complainant sees.
        </p>
      )}
    </form>
  );
}
