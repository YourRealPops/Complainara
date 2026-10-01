"use client";

import { useEffect, useState } from "react";
import {
  getComplaints,
  type Complaint,
} from "@/lib/complaints";
import { getSession } from "@/lib/auth-client";
import { ApiError } from "@/lib/api";
import { QueueCard } from "@/components/dashboard/QueueCard";
import { sortQueueByUrgency } from "@/lib/queue";

/** Resolver's history: this unit's RESOLVED + CLOSED complaints, newest first. */
export default function ResolvedPage() {
  const session = getSession();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getComplaints()
      .then((all) =>
        setComplaints(
          all.filter(
            (c) => c.status === "RESOLVED" || c.status === "CLOSED",
          ),
        ),
      )
      .catch((err) =>
        setError(
          err instanceof ApiError ? err.message : "Failed to load complaints.",
        ),
      )
      .finally(() => setLoading(false));
  }, []);

  // sortQueueByUrgency puts settled items last, newest-created first within
  // the settled group — exactly the "history" ordering we want.
  const sorted = sortQueueByUrgency(complaints);

  if (loading) {
    return <p className="mt-6 text-sm text-muted">Loading…</p>;
  }

  if (error) {
    return (
      <div className="mt-6 rounded-lg border border-stamp/30 bg-stamp/10 px-4 py-3 text-sm text-stamp">
        {error}
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-foreground">
        Resolved
      </h1>
      <p className="mt-1 text-sm text-muted">
        Complaints your unit has resolved or closed.{" "}
        {session?.role === "RESOLVER" && "Scope: your unit + complaints you filed."}
      </p>

      {complaints.length === 0 ? (
        <p className="mt-6 text-sm text-muted">
          Nothing resolved yet. Items you mark RESOLVED will appear here.
        </p>
      ) : (
        <div className="mt-6 flex flex-col gap-3">
          {sorted.map((complaint) => (
            <QueueCard key={complaint.id} complaint={complaint} />
          ))}
        </div>
      )}
    </div>
  );
}
