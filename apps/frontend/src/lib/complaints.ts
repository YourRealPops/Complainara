import { apiFetch } from "./api";

export type ComplaintStatus =
  | "SUBMITTED"
  | "ACKNOWLEDGED"
  | "IN_PROGRESS"
  | "RESOLVED"
  | "CLOSED"
  | "ESCALATED";

export type ComplaintPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export type ComplaintUpdate = {
  id: string;
  complaintId: string;
  authorId: string;
  author?: { id: string; name: string } | null;
  note: string | null;
  oldStatus: ComplaintStatus | null;
  newStatus: ComplaintStatus;
  createdAt: string;
};

export type Complaint = {
  id: string;
  complainantId: string;
  title: string;
  description: string;
  location: string;
  status: ComplaintStatus;
  priority: ComplaintPriority;
  slaDueAt: string | null;
  createdAt: string;
  resolvedAt: string | null;
  category: { id: string; name: string };
  assignedUnit: { id: string; name: string } | null;
  /** Resolver the complaint is assigned to — null while unassigned. */
  assignedResolverId?: string | null;
  assignedResolver?: { id: string; name: string } | null;
  updates?: ComplaintUpdate[];
};

export type QueueSummary = {
  needsAction: number;
  overdue: number;
  inProgress: number;
  resolvedToday: number;
};

export function getComplaints() {
  return apiFetch<Complaint[]>("/complaints");
}

export function getQueueSummary() {
  return apiFetch<QueueSummary>("/complaints/queue-summary");
}

export function getComplaintById(id: string) {
  return apiFetch<Complaint>(`/complaints/${id}`);
}

export function createComplaint(data: {
  title: string;
  description: string;
  location: string;
  categoryId: string;
  priority?: ComplaintPriority;
}) {
  return apiFetch<Complaint>("/complaints", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/**
 * ORG_ADMIN only. Assign / reassign (resolverId) or unassign (resolverId: null)
 * the resolver on a complaint. Returns the updated complaint.
 */
export function assignComplaint(id: string, resolverId: string | null) {
  return apiFetch<Complaint>(`/complaints/${id}/assign`, {
    method: "PATCH",
    body: JSON.stringify({ resolverId }),
  });
}

export function updateComplaintStatus(
  id: string,
  status: ComplaintStatus,
  note?: string,
) {
  return apiFetch<Complaint>(`/complaints/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status, note }),
  });
}

/** Mirror of backend complaint-status.rules.ts */
const ALLOWED_TRANSITIONS: Record<ComplaintStatus, ComplaintStatus[]> = {
  SUBMITTED: ["ACKNOWLEDGED", "ESCALATED"],
  ACKNOWLEDGED: ["IN_PROGRESS", "ESCALATED"],
  IN_PROGRESS: ["RESOLVED", "ESCALATED"],
  RESOLVED: ["CLOSED", "IN_PROGRESS"],
  ESCALATED: ["IN_PROGRESS", "ACKNOWLEDGED"],
  CLOSED: [],
};

export function getValidTransitions(status: ComplaintStatus): ComplaintStatus[] {
  return ALLOWED_TRANSITIONS[status];
}

/** Mirror of backend getResolverTransitions — escalation is system/admin-only. */
export function getResolverTransitions(status: ComplaintStatus): ComplaintStatus[] {
  return ALLOWED_TRANSITIONS[status].filter((s) => s !== "ESCALATED");
}

/** Transitions that require a note — RESOLVED's note is the resolution summary the complainant sees. */
export const TRANSITIONS_REQUIRING_NOTE: readonly ComplaintStatus[] = [
  "RESOLVED",
];
