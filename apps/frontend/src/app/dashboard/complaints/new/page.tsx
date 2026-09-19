"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  createComplaint,
  type Complaint,
  type ComplaintPriority,
} from "@/lib/complaints";
import { getCategories, type Category } from "@/lib/categories";
import { ApiError } from "@/lib/api";

const PRIORITY_OPTIONS: { value: ComplaintPriority; label: string }[] = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "URGENT", label: "Urgent" },
];

export default function NewComplaintPage() {
  const router = useRouter();

  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [priority, setPriority] = useState<ComplaintPriority>("MEDIUM");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState<Complaint | null>(null);

  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch(() => setError("Failed to load categories."))
      .finally(() => setLoadingCategories(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const complaint = await createComplaint({
        title,
        description,
        location,
        categoryId,
        priority,
      });
      setSubmitted(complaint);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to submit complaint.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  // Success confirmation screen
  if (submitted) {
    const slaDate = submitted.slaDueAt
      ? new Date(submitted.slaDueAt).toLocaleString()
      : null;

    return (
      <div className="mx-auto max-w-xl">
        <div className="rounded-xl border border-teal/30 bg-teal/10 p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-teal/20">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-teal"
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            Complaint submitted
          </h1>
          <p className="mt-2 font-mono text-sm text-muted">
            Reference: {submitted.id.slice(0, 8).toUpperCase()}
          </p>
        </div>

        <div className="mt-6 rounded-xl border border-line bg-surface p-5">
          <h2 className="font-display text-sm font-bold uppercase tracking-wide text-muted">
            What happens next
          </h2>
          <div className="mt-3 space-y-3">
            {submitted.assignedUnit && (
              <div className="flex items-center gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal/10 font-mono text-xs text-teal">
                  1
                </span>
                <span className="text-sm text-foreground">
                  Routed to <strong>{submitted.assignedUnit.name}</strong>
                </span>
              </div>
            )}
            {slaDate && (
              <div className="flex items-center gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal/10 font-mono text-xs text-teal">
                  {submitted.assignedUnit ? "2" : "1"}
                </span>
                <span className="text-sm text-foreground">
                  Expected resolution by <strong>{slaDate}</strong>
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <Link
            href={`/dashboard/complaints/${submitted.id}`}
            className="flex-1 rounded-lg bg-teal px-4 py-3 text-center font-mono text-sm font-medium text-bg transition-colors hover:bg-teal/80"
          >
            View complaint
          </Link>
          <Link
            href="/dashboard"
            className="flex-1 rounded-lg border border-line px-4 py-3 text-center font-mono text-sm text-muted transition-colors hover:text-foreground"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="font-display text-2xl font-bold text-foreground">
        New Complaint
      </h1>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        {/* Title */}
        <div>
          <label
            htmlFor="title"
            className="mb-1 block font-mono text-xs text-muted"
          >
            Title
          </label>
          <input
            id="title"
            type="text"
            required
            maxLength={150}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Brief description of the issue"
            className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-muted/50 outline-none focus:border-teal/40"
          />
        </div>

        {/* Description */}
        <div>
          <label
            htmlFor="description"
            className="mb-1 block font-mono text-xs text-muted"
          >
            Description
          </label>
          <textarea
            id="description"
            required
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Detailed description of the complaint"
            className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-muted/50 outline-none focus:border-teal/40"
          />
        </div>

        {/* Location */}
        <div>
          <label
            htmlFor="location"
            className="mb-1 block font-mono text-xs text-muted"
          >
            Location
          </label>
          <input
            id="location"
            type="text"
            required
            maxLength={150}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g. Hostel B, Room 204"
            className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-muted/50 outline-none focus:border-teal/40"
          />
        </div>

        {/* Category */}
        <div>
          <label
            htmlFor="category"
            className="mb-1 block font-mono text-xs text-muted"
          >
            Category
          </label>
          {loadingCategories ? (
            <p className="text-sm text-muted">Loading categories…</p>
          ) : (
            <select
              id="category"
              required
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm text-foreground outline-none focus:border-teal/40"
            >
              <option value="" disabled>
                Select a category
              </option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name} (SLA: {cat.slaHours}h)
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Priority */}
        <div>
          <label
            htmlFor="priority"
            className="mb-1 block font-mono text-xs text-muted"
          >
            Priority
          </label>
          <select
            id="priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value as ComplaintPriority)}
            className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm text-foreground outline-none focus:border-teal/40"
          >
            {PRIORITY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <div className="rounded-lg border border-stamp/30 bg-stamp/10 px-4 py-3 text-sm text-stamp">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || loadingCategories}
          className="mt-2 rounded-lg bg-teal px-4 py-2.5 font-mono text-sm font-medium text-bg transition-colors hover:bg-teal/80 disabled:opacity-50"
        >
          {submitting ? "Submitting…" : "Submit Complaint"}
        </button>
      </form>
    </div>
  );
}
