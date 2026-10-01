"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  getComplaints,
  getQueueSummary,
  type Complaint,
  type QueueSummary,
} from "@/lib/complaints";
import { getSession } from "@/lib/auth-client";
import { ApiError } from "@/lib/api";
import { ComplaintCard } from "@/components/dashboard/ComplaintCard";
import { QueueCard } from "@/components/dashboard/QueueCard";
import { sortQueueByUrgency } from "@/lib/queue";

type QueueTab = "all" | "needs-action" | "in-progress" | "resolved";

const QUEUE_TABS: { key: QueueTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "needs-action", label: "Needs action" },
  { key: "in-progress", label: "In progress" },
  { key: "resolved", label: "Resolved" },
];

const NEEDS_ACTION_STATUSES = ["SUBMITTED", "ACKNOWLEDGED"];
const IN_PROGRESS_STATUSES = ["IN_PROGRESS", "ESCALATED"];
const RESOLVED_STATUSES = ["RESOLVED", "CLOSED"];

function matchesTab(complaint: Complaint, tab: QueueTab): boolean {
  switch (tab) {
    case "needs-action":
      return NEEDS_ACTION_STATUSES.includes(complaint.status);
    case "in-progress":
      return IN_PROGRESS_STATUSES.includes(complaint.status);
    case "resolved":
      return RESOLVED_STATUSES.includes(complaint.status);
    default:
      return true;
  }
}

export default function DashboardPage() {
  const session = getSession();
  const role = session?.role;
  const isComplainant = role === "COMPLAINANT";
  const isResolver = role === "RESOLVER";

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [summary, setSummary] = useState<QueueSummary | null>(null);
  const [tab, setTab] = useState<QueueTab>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const requests: Promise<void>[] = [
      getComplaints()
        .then(setComplaints)
        .catch((err) =>
          setError(
            err instanceof ApiError ? err.message : "Failed to load complaints.",
          ),
        ),
    ];

    if (isResolver) {
      // Stats strip is optional decoration — a failure here shouldn't kill the queue.
      requests.push(
        getQueueSummary()
          .then(setSummary)
          .catch(() => setSummary(null)),
      );
    }

    Promise.all(requests).finally(() => setLoading(false));
  }, [isResolver]);

  const visibleComplaints = useMemo(() => {
    if (!isResolver) return complaints;
    const filtered = complaints.filter((c) => matchesTab(c, tab));
    return sortQueueByUrgency(filtered);
  }, [complaints, isResolver, tab]);

  const tabCounts = useMemo(() => {
    const counts: Record<QueueTab, number> = {
      all: complaints.length,
      "needs-action": 0,
      "in-progress": 0,
      resolved: 0,
    };
    for (const c of complaints) {
      if (NEEDS_ACTION_STATUSES.includes(c.status)) counts["needs-action"]++;
      else if (IN_PROGRESS_STATUSES.includes(c.status)) counts["in-progress"]++;
      else if (RESOLVED_STATUSES.includes(c.status)) counts.resolved++;
    }
    return counts;
  }, [complaints]);

  const heading = isComplainant
    ? "My Complaints"
    : isResolver
      ? "My Queue"
      : "Complaints";

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold text-foreground">
          {heading}
        </h1>
        {isComplainant && (
          <Link
            href="/dashboard/complaints/new"
            className="rounded-full bg-teal px-5 py-2.5 font-mono text-xs font-medium text-bg transition-shadow hover:shadow-[0_0_24px_rgba(47,230,192,0.5)]"
          >
            + File a complaint
          </Link>
        )}
      </div>

      {/* Resolver stats strip */}
      {isResolver && summary && (
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatChip label="Needs action" value={summary.needsAction} accent />
          <StatChip label="Overdue" value={summary.overdue} danger={summary.overdue > 0} />
          <StatChip label="In progress" value={summary.inProgress} />
          <StatChip label="Resolved today" value={summary.resolvedToday} />
        </div>
      )}

      {/* Resolver filter tabs */}
      {isResolver && !loading && !error && complaints.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-2" role="tablist">
          {QUEUE_TABS.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={`rounded-full px-4 py-1.5 font-mono text-xs transition-colors ${
                tab === t.key
                  ? "bg-teal/15 text-teal"
                  : "text-muted hover:bg-bg hover:text-foreground"
              }`}
            >
              {t.label} ({tabCounts[t.key]})
            </button>
          ))}
        </div>
      )}

      {loading && <p className="mt-6 text-sm text-muted">Loading…</p>}

      {error && (
        <div className="mt-6 rounded-lg border border-stamp/30 bg-stamp/10 px-4 py-3 text-sm text-stamp">
          {error}
        </div>
      )}

      {!loading && !error && complaints.length === 0 && (
        <div className="mt-6 text-center">
          <p className="text-sm text-muted">
            {isComplainant
              ? "You haven't filed any complaints yet."
              : isResolver
                ? "Nothing needs attention right now."
                : "No complaints yet."}
          </p>
          {isComplainant && (
            <Link
              href="/dashboard/complaints/new"
              className="mt-4 inline-block rounded-lg border border-teal/30 bg-teal/10 px-6 py-3 font-mono text-sm text-teal transition-colors hover:bg-teal/20"
            >
              File your first complaint
            </Link>
          )}
        </div>
      )}

      {!loading && complaints.length > 0 && visibleComplaints.length === 0 && (
        <p className="mt-6 text-sm text-muted">
          Nothing in “{QUEUE_TABS.find((t) => t.key === tab)?.label}” right now.
        </p>
      )}

      {!loading && visibleComplaints.length > 0 && (
        <div className="mt-6 flex flex-col gap-3">
          {visibleComplaints.map((complaint) =>
            isResolver ? (
              <QueueCard key={complaint.id} complaint={complaint} />
            ) : (
              <ComplaintCard key={complaint.id} complaint={complaint} />
            ),
          )}
        </div>
      )}
    </div>
  );
}

function StatChip({
  label,
  value,
  accent,
  danger,
}: {
  label: string;
  value: number;
  accent?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="rounded-xl border border-line bg-surface px-4 py-3">
      <p
        className={`font-display text-xl font-bold ${
          danger ? "text-stamp" : accent ? "text-teal" : "text-foreground"
        }`}
      >
        {value}
      </p>
      <p className="mt-0.5 font-mono text-xs text-muted">{label}</p>
    </div>
  );
}
