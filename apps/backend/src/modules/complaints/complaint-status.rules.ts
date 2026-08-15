import { ComplaintStatus } from '@prisma/client';

const ALLOWED_TRANSITIONS: Record<ComplaintStatus, ComplaintStatus[]> = {
  SUBMITTED: [ComplaintStatus.ACKNOWLEDGED, ComplaintStatus.ESCALATED],
  ACKNOWLEDGED: [ComplaintStatus.IN_PROGRESS, ComplaintStatus.ESCALATED],
  IN_PROGRESS: [ComplaintStatus.RESOLVED, ComplaintStatus.ESCALATED],
  RESOLVED: [ComplaintStatus.CLOSED, ComplaintStatus.IN_PROGRESS], // reopened if complainant disputes the fix
  ESCALATED: [ComplaintStatus.IN_PROGRESS, ComplaintStatus.ACKNOWLEDGED],
  CLOSED: [], // terminal state — no transitions out
};

export function isValidTransition(
  from: ComplaintStatus,
  to: ComplaintStatus,
): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}
