"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createComplaint, type ComplaintPriority } from "@/lib/complaints";
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
      router.push(`/dashboard/complaints/${complaint.id}`);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to submit complaint.",
      );
    } finally {
      setSubmitting(false);
    }
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
