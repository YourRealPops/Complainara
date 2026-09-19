"use client";

import { useEffect, useState } from "react";
import {
  getJoinCode,
  regenerateJoinCode,
  updateOrganizationSettings,
} from "@/lib/organization";
import { ApiError } from "@/lib/api";

export default function SettingsPage() {
  const [joinCode, setJoinCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  // Email domain settings
  const [domain, setDomain] = useState("");
  const [savingDomain, setSavingDomain] = useState(false);
  const [domainSaved, setDomainSaved] = useState(false);

  useEffect(() => {
    getJoinCode()
      .then((data) => {
        setJoinCode(data.joinCode);
        setLoading(false);
      })
      .catch((err) => {
        setError(
          err instanceof ApiError ? err.message : "Failed to load settings.",
        );
        setLoading(false);
      });
  }, []);

  function handleCopy() {
    const url = `${window.location.origin}/join/${joinCode}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleRegenerate() {
    if (
      !confirm(
        "This will invalidate the current join code. Anyone with the old link will no longer be able to join. Continue?",
      )
    ) {
      return;
    }
    setRegenerating(true);
    setError("");
    try {
      const data = await regenerateJoinCode();
      setJoinCode(data.joinCode);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to regenerate code.",
      );
    } finally {
      setRegenerating(false);
    }
  }

  async function handleSaveDomain(e: React.FormEvent) {
    e.preventDefault();
    setSavingDomain(true);
    setDomainSaved(false);
    setError("");
    try {
      await updateOrganizationSettings({
        allowedEmailDomain: domain || undefined,
      });
      setDomainSaved(true);
      setTimeout(() => setDomainSaved(false), 2000);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to update settings.",
      );
    } finally {
      setSavingDomain(false);
    }
  }

  const joinUrl = joinCode
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/join/${joinCode}`
    : "";

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-2xl font-bold text-foreground">
        Settings
      </h1>

      {loading && <p className="mt-6 text-sm text-muted">Loading…</p>}

      {error && (
        <div className="mt-6 rounded-lg border border-stamp/30 bg-stamp/10 px-4 py-3 text-sm text-stamp">
          {error}
        </div>
      )}

      {/* Join Code Section */}
      {!loading && joinCode && (
        <div className="mt-6 rounded-xl border border-line bg-surface p-5">
          <h2 className="font-display text-sm font-bold uppercase tracking-wide text-muted">
            Join Code
          </h2>
          <p className="mt-2 text-sm text-muted">
            Share this code or link with members so they can join your
            organization.
          </p>

          <div className="mt-4 flex items-center gap-3">
            <div className="flex-1 rounded-lg border border-line bg-bg px-4 py-3 font-mono text-lg tracking-wider text-foreground">
              {joinCode}
            </div>
            <button
              onClick={handleCopy}
              className="shrink-0 rounded-lg border border-line bg-bg px-4 py-3 font-mono text-xs text-muted transition-colors hover:text-foreground"
            >
              {copied ? "Copied!" : "Copy link"}
            </button>
          </div>

          {joinUrl && (
            <p className="mt-3 break-all font-mono text-xs text-muted">
              {joinUrl}
            </p>
          )}

          <button
            onClick={handleRegenerate}
            disabled={regenerating}
            className="mt-4 rounded-lg border border-stamp/30 bg-stamp/10 px-4 py-2 font-mono text-xs text-stamp transition-colors hover:bg-stamp/20 disabled:opacity-50"
          >
            {regenerating ? "Regenerating…" : "Regenerate code"}
          </button>
        </div>
      )}

      {/* Email Domain Restriction */}
      <div className="mt-6 rounded-xl border border-line bg-surface p-5">
        <h2 className="font-display text-sm font-bold uppercase tracking-wide text-muted">
          Email Domain Restriction
        </h2>
        <p className="mt-2 text-sm text-muted">
          Optionally restrict who can join using the join code. Only email
          addresses matching this domain will be accepted.
        </p>

        <form onSubmit={handleSaveDomain} className="mt-4 flex items-end gap-3">
          <div className="flex-1">
            <label
              htmlFor="email-domain"
              className="mb-1 block font-mono text-xs text-muted"
            >
              Allowed email domain
            </label>
            <input
              id="email-domain"
              type="text"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="e.g. university.edu.ng (leave empty for no restriction)"
              className="w-full rounded-lg border border-line bg-bg px-3 py-2.5 text-sm text-foreground placeholder:text-muted/50 outline-none focus:border-teal/40"
            />
          </div>
          <button
            type="submit"
            disabled={savingDomain}
            className="shrink-0 rounded-lg bg-teal px-4 py-2.5 font-mono text-xs font-medium text-bg transition-colors hover:bg-teal/80 disabled:opacity-50"
          >
            {savingDomain ? "Saving…" : domainSaved ? "Saved!" : "Save"}
          </button>
        </form>
      </div>
    </div>
  );
}
