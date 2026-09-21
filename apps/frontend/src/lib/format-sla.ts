import type { ComplaintStatus } from "./complaints";

export function formatSlaCountdown(
  slaDueAt: string | null,
  status?: ComplaintStatus,
): {
  label: string;
  overdue: boolean;
} {
  const isSettled = status === "RESOLVED" || status === "CLOSED";

  if (!slaDueAt) return { label: "No deadline", overdue: false };

  const due = new Date(slaDueAt).getTime();
  const now = Date.now();
  const diffMs = due - now;

  if (diffMs <= 0) {
    return isSettled
      ? { label: "Closed", overdue: false }
      : { label: "Overdue", overdue: true };
  }

  if (isSettled) {
    return { label: "Closed", overdue: false };
  }

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return { label: `${days}d ${hours % 24}h left`, overdue: false };
  }
  return { label: `${hours}h left`, overdue: false };
}
