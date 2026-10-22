"use client";

import { useEffect, useState } from "react";
import { getBranches, type Branch } from "@/lib/branches";
import { getSession } from "@/lib/auth-client";
import { ApiError } from "@/lib/api";

export type BranchesState = {
  branches: Branch[];
  loading: boolean;
  /**
   * Single-site orgs (only the default "Main" branch) must see NO branch UI
   * anywhere — this flips to true only once a second branch exists.
   */
  isMultiBranch: boolean;
  error: string;
  /** Re-read branches after create/delete. */
  refresh: () => void;
};

/**
 * Fetches the caller's visible branches. ORG_ADMIN sees all; BRANCH_ADMIN
 * only their own (so isMultiBranch stays false for them — correct, they
 * have no branch to switch to).
 */
export function useBranches(): BranchesState {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const session = getSession();
    // Only roles the backend allows on GET /branches; everyone else has no
    // branch UI at all, so skip the call (it would just 403).
    if (
      !session ||
      (session.role !== "ORG_ADMIN" && session.role !== "BRANCH_ADMIN")
    ) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const data = await getBranches();
        if (!cancelled) setBranches(data);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError ? err.message : "Failed to load branches.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [tick]);

  return {
    branches,
    loading,
    // A single Main branch = single-site: hide all branch UI.
    isMultiBranch: branches.length > 1,
    error,
    refresh: () => setTick((t) => t + 1),
  };
}
