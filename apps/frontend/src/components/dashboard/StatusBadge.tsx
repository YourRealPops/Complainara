import type { Complaint } from "@/lib/complaints";

const STATUS_STYLES: Record<Complaint["status"], string> = {
  SUBMITTED: "bg-muted/10 text-muted",
  ACKNOWLEDGED: "bg-teal/10 text-teal",
  IN_PROGRESS: "bg-stamp/10 text-stamp",
  RESOLVED: "bg-teal/10 text-teal",
  CLOSED: "bg-muted/10 text-muted",
  ESCALATED: "bg-stamp/20 text-stamp",
};

const STATUS_LABELS: Record<Complaint["status"], string> = {
  SUBMITTED: "Submitted",
  ACKNOWLEDGED: "Acknowledged",
  IN_PROGRESS: "In progress",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
  ESCALATED: "Escalated",
};

export function StatusBadge({ status }: { status: Complaint["status"] }) {
  return (
    <span
      className={`inline-block rounded-full px-3 py-1 font-mono text-xs uppercase tracking-wide ${STATUS_STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
