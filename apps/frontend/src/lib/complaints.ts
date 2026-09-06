import { apiFetch } from "./api";

export type Complaint = {
  id: string;
  title: string;
  description: string;
  location: string;
  status: "SUBMITTED" | "ACKNOWLEDGED" | "IN_PROGRESS" | "RESOLVED" | "CLOSED" | "ESCALATED";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  slaDueAt: string | null;
  createdAt: string;
  resolvedAt: string | null;
  category: { id: string; name: string };
  assignedUnit: { id: string; name: string } | null;
};

export function getComplaints() {
  return apiFetch<Complaint[]>("/complaints");
}
