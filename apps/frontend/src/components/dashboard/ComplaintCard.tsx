import Link from "next/link";
import type { Complaint } from "@/lib/complaints";
import { StatusBadge } from "./StatusBadge";
import { formatSlaCountdown } from "@/lib/format-sla";

export function ComplaintCard({ complaint }: { complaint: Complaint }) {
  const sla = formatSlaCountdown(complaint.slaDueAt, complaint.status);

  return (
    <Link
      href={`/dashboard/complaints/${complaint.id}`}
      className="block rounded-xl border border-line bg-surface p-5 transition-colors hover:border-teal/40"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-display text-base font-bold text-foreground">
            {complaint.title}
          </p>
          <p className="mt-1 text-sm text-muted">
            {complaint.category.name} · {complaint.location}
          </p>
        </div>
        <StatusBadge status={complaint.status} />
      </div>

      <div className="mt-4 flex items-center justify-between font-mono text-xs">
        <span className={sla.overdue ? "text-stamp" : "text-muted"}>
          {sla.label}
        </span>
        {complaint.assignedUnit ? (
          <span className="text-muted">{complaint.assignedUnit.name}</span>
        ) : (
          // No unit = the branch has no route for this category yet.
          <span className="rounded-full bg-stamp/10 px-2 py-0.5 font-mono text-[11px] uppercase tracking-wide text-stamp">
            Needs routing
          </span>
        )}
      </div>
    </Link>
  );
}
