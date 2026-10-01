import Link from "next/link";
import type { Complaint } from "@/lib/complaints";
import { StatusBadge } from "./StatusBadge";
import { formatSlaCountdown } from "@/lib/format-sla";

/** True when the SLA deadline has passed and the complaint isn't settled. */
export function isOverdue(complaint: Complaint): boolean {
  if (!complaint.slaDueAt) return false;
  if (complaint.status === "RESOLVED" || complaint.status === "CLOSED") {
    return false;
  }
  return new Date(complaint.slaDueAt).getTime() <= Date.now();
}

export function QueueCard({ complaint }: { complaint: Complaint }) {
  const sla = formatSlaCountdown(complaint.slaDueAt, complaint.status);
  const overdue = isOverdue(complaint);
  const escalated = complaint.status === "ESCALATED";
  const needsAttention = overdue || escalated;

  return (
    <Link
      href={`/dashboard/complaints/${complaint.id}`}
      className={`block rounded-xl border bg-surface p-5 transition-colors ${
        needsAttention
          ? "border-stamp/40 hover:border-stamp/60"
          : "border-line hover:border-teal/40"
      }`}
      aria-label={`Open complaint: ${complaint.title}`}
    >
      {/* Top row: title + status badge */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-display text-base font-bold text-foreground">
            {complaint.title}
          </p>
          <p className="mt-1 text-sm text-muted">
            {complaint.category.name} · {complaint.location}
          </p>
        </div>
        <StatusBadge status={complaint.status} />
      </div>

      {/* Bottom row: SLA countdown + priority */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 font-mono text-xs">
        <span className={overdue ? "text-stamp" : "text-muted"}>
          {sla.label}
          {needsAttention && (
            <span className="ml-2 text-stamp/80">
              {overdue ? "· needs attention" : "· escalated"}
            </span>
          )}
        </span>
        <span className="text-muted">Priority: {complaint.priority}</span>
      </div>
    </Link>
  );
}
