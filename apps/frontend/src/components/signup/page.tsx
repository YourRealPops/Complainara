"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { GlassCard } from "@/components/ui/GlassCard";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

const ORG_TYPES = [
  "School",
  "University",
  "Workplace",
  "Government",
  "NGO",
  "Other",
];

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    organizationName: "",
    organizationType: "",
    adminName: "",
    adminEmail: "",
    adminPassword: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message ?? "Signup failed. Please try again.");
        return;
      }

      localStorage.setItem("accessToken", data.accessToken);
      router.push("/dashboard");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="relative flex min-h-[calc(100vh-80px)] items-center justify-center px-6 py-16">
      <Link
        href="/"
        className="absolute left-6 top-6 font-display text-lg font-extrabold tracking-tight text-foreground hover:text-teal transition-colors"
      >
        Complainara
      </Link>

      <motion.div
        initial="hidden"
        animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
        className="w-full max-w-md"
      >
        <motion.div variants={fadeUp} className="mb-8 text-center">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-stamp">
            Get started
          </p>
          <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-foreground">
            Create your organization
          </h1>
          <p className="mt-2 text-sm text-muted">
            Already have an account?{" "}
            <Link href="/login" className="text-teal hover:underline">
              Log in
            </Link>
          </p>
        </motion.div>

        <motion.div variants={fadeUp}>
          <GlassCard className="px-8 py-10">
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              {error && (
                <div className="rounded-lg border border-stamp/30 bg-stamp/10 px-4 py-3 text-sm text-stamp">
                  {error}
                </div>
              )}

              {/* Organization */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="organizationName"
                  className="font-mono text-xs uppercase tracking-wider text-muted"
                >
                  Organization name
                </label>
                <input
                  id="organizationName"
                  type="text"
                  required
                  maxLength={255}
                  value={form.organizationName}
                  onChange={(e) => updateField("organizationName", e.target.value)}
                  placeholder="e.g. Acme University"
                  className="rounded-lg border border-line bg-surface px-4 py-3 text-sm text-foreground placeholder:text-muted/50 outline-none transition-colors focus:border-teal"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="organizationType"
                  className="font-mono text-xs uppercase tracking-wider text-muted"
                >
                  Organization type
                </label>
                <select
                  id="organizationType"
                  required
                  value={form.organizationType}
                  onChange={(e) => updateField("organizationType", e.target.value)}
                  className="rounded-lg border border-line bg-surface px-4 py-3 text-sm text-foreground outline-none transition-colors focus:border-teal"
                >
                  <option value="" disabled>
                    Select a type
                  </option>
                  {ORG_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div className="h-px bg-line" />

              {/* Admin details */}
              <p className="font-mono text-xs uppercase tracking-wider text-muted">
                Admin account
              </p>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="adminName"
                  className="font-mono text-xs uppercase tracking-wider text-muted"
                >
                  Full name
                </label>
                <input
                  id="adminName"
                  type="text"
                  required
                  value={form.adminName}
                  onChange={(e) => updateField("adminName", e.target.value)}
                  placeholder="Jane Doe"
                  className="rounded-lg border border-line bg-surface px-4 py-3 text-sm text-foreground placeholder:text-muted/50 outline-none transition-colors focus:border-teal"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="adminEmail"
                  className="font-mono text-xs uppercase tracking-wider text-muted"
                >
                  Email
                </label>
                <input
                  id="adminEmail"
                  type="email"
                  required
                  value={form.adminEmail}
                  onChange={(e) => updateField("adminEmail", e.target.value)}
                  placeholder="admin@example.com"
                  className="rounded-lg border border-line bg-surface px-4 py-3 text-sm text-foreground placeholder:text-muted/50 outline-none transition-colors focus:border-teal"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="adminPassword"
                  className="font-mono text-xs uppercase tracking-wider text-muted"
                >
                  Password
                </label>
                <input
                  id="adminPassword"
                  type="password"
                  required
                  minLength={8}
                  value={form.adminPassword}
                  onChange={(e) => updateField("adminPassword", e.target.value)}
                  placeholder="At least 8 characters"
                  className="rounded-lg border border-line bg-surface px-4 py-3 text-sm text-foreground placeholder:text-muted/50 outline-none transition-colors focus:border-teal"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 rounded-full bg-teal px-6 py-3 text-sm font-medium text-bg transition-shadow hover:shadow-[0_0_24px_rgba(47,230,192,0.5)] disabled:opacity-50"
              >
                {loading ? "Creating account…" : "Create account"}
              </button>
            </form>
          </GlassCard>
        </motion.div>
      </motion.div>
    </section>
  );
}
