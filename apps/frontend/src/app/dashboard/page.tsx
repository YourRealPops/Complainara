"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getComplaints, type Complaint } from "@/lib/complaints";
import { getSession } from "@/lib/auth-client";
import { ApiError } from "@/lib/api";
import { ComplaintCard } from "@/components/dashboard/ComplaintCard";

export default function ComplaintsPage() {
  const session = getSession();
  const isComplainant = session?.role === "COMPLAINANT";

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getComplaints()
      .then(setComplaints)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load complaints."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-foreground">
          {isComplainant ? "My Complaints" : "Complaints"}
        </h1>
        {isComplainant ? (
          <Link
            href="/dashboard/complaints/new"
            className="rounded-full bg-teal px-5 py-2.5 font-mono text-xs font-medium text-bg transition-shadow hover:shadow-[0_0_24px_rgba(47,230,192,0.5)]"
          >
            + File a complaint
          </Link>
        ) : (
          <Link
            href="/dashboard/complaints/new"
            className="rounded-lg bg-teal px-4 py-2 font-mono text-xs font-medium text-bg transition-colors hover:bg-teal/80"
          >
            + New Complaint
          </Link>
        )}
      </div>

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

      {!loading && complaints.length > 0 && (
        <div className="mt-6 flex flex-col gap-3">
          {complaints.map((complaint) => (
            <ComplaintCard key={complaint.id} complaint={complaint} />
          ))}
        </div>
      )}
    </div>
  );
}
