"use client";

import { useEffect, useState } from "react";
import { getComplaints, type Complaint } from "@/lib/complaints";
import { ApiError } from "@/lib/api";
import { ComplaintCard } from "@/components/dashboard/ComplaintCard";

export default function ComplaintsPage() {
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
      <h1 className="font-display text-2xl font-bold text-foreground">
        Complaints
      </h1>

      {loading && <p className="mt-6 text-sm text-muted">Loading…</p>}

      {error && (
        <div className="mt-6 rounded-lg border border-stamp/30 bg-stamp/10 px-4 py-3 text-sm text-stamp">
          {error}
        </div>
      )}

      {!loading && !error && complaints.length === 0 && (
        <p className="mt-6 text-sm text-muted">
          No complaints yet.
        </p>
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
