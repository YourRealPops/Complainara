import type { ComplaintUpdate, ComplaintStatus } from "@/lib/complaints";

const STATUS_LABELS: Record<ComplaintStatus, string> = {
  SUBMITTED: "Submitted",
  ACKNOWLEDGED: "Acknowledged",
  IN_PROGRESS: "In Progress",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
  ESCALATED: "Escalated",
};

export function ComplaintTimeline({ updates }: { updates: ComplaintUpdate[] }) {
  if (updates.length === 0) {
    return (
      <p className="mt-3 text-sm text-muted">No status changes yet.</p>
    );
  }

  // Sort oldest first
  const sorted = [...updates].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  return (
    <div className="mt-3 flex flex-col gap-3">
      {sorted.map((update) => (
        <div
          key={update.id}
          className="flex items-start gap-3 rounded-lg border border-line bg-surface p-4"
        >
          <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-teal" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              {update.oldStatus && (
                <>
                  <span className="font-mono text-muted">
                    {STATUS_LABELS[update.oldStatus]}
                  </span>
                  <span className="text-muted">→</span>
                </>
              )}
              <span className="font-mono font-medium text-foreground">
                {STATUS_LABELS[update.newStatus]}
              </span>
            </div>
            {update.note && (
              <p className="mt-1 text-sm text-muted">{update.note}</p>
            )}
            <p className="mt-1 font-mono text-xs text-muted">
              {new Date(update.createdAt).toLocaleString()}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
