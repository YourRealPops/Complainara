export function formatSlaCountdown(slaDueAt: string | null): {
  label: string;
  overdue: boolean;
} {
  if (!slaDueAt) return { label: "No deadline", overdue: false };

  const due = new Date(slaDueAt).getTime();
  const now = Date.now();
  const diffMs = due - now;

  if (diffMs <= 0) {
    return { label: "Overdue", overdue: true };
  }

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return { label: `${days}d ${hours % 24}h left`, overdue: false };
  }
  return { label: `${hours}h left`, overdue: false };
}
