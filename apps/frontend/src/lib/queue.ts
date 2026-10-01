import type { Complaint, ComplaintStatus } from "./complaints";

/**
 * Sorts a resolver's queue by urgency:
 *  1. Overdue or escalated first (SLA already breached / flagged by the system)
 *  2. Then by SLA deadline ascending (soonest first)
 *  3. Complaints with no deadline last, newest created first
 * Settled complaints (RESOLVED/CLOSED) sink to the bottom within each group.
 */
export function sortQueueByUrgency(complaints: Complaint[]): Complaint[] {
  return [...complaints].sort((a, b) => {
    const pa = queuePriority(a);
    const pb = queuePriority(b);
    if (pa !== pb) return pa - pb;
    return compareWithinGroup(a, b);
  });
}

/** Lower number = more urgent. */
function queuePriority(complaint: Complaint): number {
  if (isSettled(complaint.status)) return 2;
  const { overdue } = countdown(complaint);
  return overdue || complaint.status === "ESCALATED" ? 0 : 1;
}

function compareWithinGroup(a: Complaint, b: Complaint): number {
  const settled = isSettled(a.status) && isSettled(b.status);
  if (settled) {
    // Resolved/closed history: most recent first
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  }
  const ta = new Date(a.slaDueAt ?? a.createdAt).getTime();
  const tb = new Date(b.slaDueAt ?? b.createdAt).getTime();
  return ta - tb;
}

function isSettled(status: ComplaintStatus): boolean {
  return status === "RESOLVED" || status === "CLOSED";
}

function countdown(complaint: Complaint): { overdue: boolean } {
  if (!complaint.slaDueAt || isSettled(complaint.status)) {
    return { overdue: false };
  }
  return {
    overdue: new Date(complaint.slaDueAt).getTime() <= Date.now(),
  };
}
