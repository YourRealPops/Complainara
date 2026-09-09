"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  getComplaintById,
  updateComplaintStatus,
  getValidTransitions,
  type Complaint,
  type ComplaintStatus,
} from "@/lib/complaints";
import { getSession } from "@/lib/auth-client";
import { ApiError } from "@/lib/api";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { formatSlaCountdown } from "@/lib/format-sla";
import { ComplaintTimeline } from "@/components/dashboard/ComplaintTimeline";
import { StatusChangeForm } from "@/components/dashboard/StatusChangeForm";

const STATUS_LABELS: Record<ComplaintStatus, string> = {
  SUBMITTED: "Submitted",
  ACKNOWLEDGED: "Acknowledged",
  IN_PROGRESS: "In Progress",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
  ESCALATED: "Escalated",
};

export default function ComplaintDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusError, setStatusError] = useState("");
  const [transitioning, setTransitioning] = useState(false);

  const session = getSession();
  const canChangeStatus =
    session?.role === "RESOLVER" || session?.role === "ORG_ADMIN";

  const fetchComplaint = useCallback(async () => {
    try {
      const data = await getComplaintById(id);
      setComplaint(data);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to load complaint.",
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchComplaint();
  }, [fetchComplaint]);

  async function handleStatusChange(newStatus: ComplaintStatus, note?: string) {
    if (!complaint) return;
    setTransitioning(true);
    setStatusError("");
    try {
      const updated = await updateComplaintStatus(complaint.id, newStatus, note);
      setComplaint(updated);
    } catch (err) {
      setStatusError(
        err instanceof ApiError ? err.message : "Failed to update status.",
      );
    } finally {
      setTransitioning(false);
    }
  }

  if (loading) {
    return (
      <p className="mt-6 font-mono text-sm text-muted">Loading…</p>
    );
  }

  if (error) {
    return (
      <div className="mt-6 rounded-lg border border-stamp/30 bg-stamp/10 px-4 py-3 text-sm text-stamp">
        {error}
      </div>
    );
  }

  if (!complaint) return null;

  const sla = formatSlaCountdown(complaint.slaDueAt);
  const validTransitions = getValidTransitions(complaint.status);

  return (
    <div className="mx-auto max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            {complaint.title}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {complaint.category.name} · {complaint.location}
          </p>
        </div>
        <StatusBadge status={complaint.status} />
      </div>

      {/* Meta row */}
      <div className="mt-4 flex flex-wrap items-center gap-4 font-mono text-xs">
        <span className={sla.overdue ? "text-stamp" : "text-muted"}>
          {sla.label}
        </span>
        <span className="text-muted">
          Priority: {complaint.priority}
        </span>
        <span className="text-muted">
          Unit: {complaint.assignedUnit?.name ?? "Unassigned"}
        </span>
        <span className="text-muted">
          Created: {new Date(complaint.createdAt).toLocaleDateString()}
        </span>
        {complaint.resolvedAt && (
          <span className="text-muted">
            Resolved: {new Date(complaint.resolvedAt).toLocaleDateString()}
          </span>
        )}
      </div>

      {/* Description */}
      <div className="mt-6 rounded-xl border border-line bg-surface p-5">
        <h2 className="font-display text-sm font-bold uppercase tracking-wide text-muted">
          Description
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-foreground">
          {complaint.description}
        </p>
      </div>

      {/* Status change */}
      {canChangeStatus && validTransitions.length > 0 && (
        <div className="mt-6">
          <StatusChangeForm
            currentStatus={complaint.status}
            validTransitions={validTransitions}
            onStatusChange={handleStatusChange}
            disabled={transitioning}
          />
          {statusError && (
            <div className="mt-3 rounded-lg border border-stamp/30 bg-stamp/10 px-4 py-3 text-sm text-stamp">
              {statusError}
            </div>
          )}
        </div>
      )}

      {/* Audit trail */}
      <div className="mt-8">
        <h2 className="font-display text-sm font-bold uppercase tracking-wide text-muted">
          History
        </h2>
        <ComplaintTimeline updates={complaint.updates ?? []} />
      </div>
    </div>
  );
}
