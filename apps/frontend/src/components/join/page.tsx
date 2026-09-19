"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import { GlassCard } from "@/components/ui/GlassCard";
import { joinOrganization } from "@/lib/join";
import { ApiError } from "@/lib/api";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" as const },
  },
};

export default function JoinPage() {
  const router = useRouter();
  const params = useParams();
  const codeFromUrl = (params.code as string) ?? "";

  const [joinCode, setJoinCode] = useState(codeFromUrl);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await joinOrganization({ joinCode, name, email, password });
      localStorage.setItem("accessToken", data.accessToken);
      router.push("/dashboard");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Something went wrong. Please try again.");
      }
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
        variants={{
          hidden: {},
          show: { transition: { staggerChildren: 0.1 } },
        }}
        className="w-full max-w-md"
      >
        <motion.div variants={fadeUp} className="mb-8 text-center">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-teal">
            Join your organization
          </p>
          <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-foreground">
            Enter with a join code
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

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="joinCode"
                  className="font-mono text-xs uppercase tracking-wider text-muted"
                >
                  Join code
                </label>
                <input
                  id="joinCode"
                  type="text"
                  required
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  placeholder="Paste your join code"
                  className="rounded-lg border border-line bg-surface px-4 py-3 font-mono text-sm text-foreground placeholder:text-muted/50 outline-none transition-colors focus:border-teal"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="name"
                  className="font-mono text-xs uppercase tracking-wider text-muted"
                >
                  Full name
                </label>
                <input
                  id="name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Doe"
                  className="rounded-lg border border-line bg-surface px-4 py-3 text-sm text-foreground placeholder:text-muted/50 outline-none transition-colors focus:border-teal"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="email"
                  className="font-mono text-xs uppercase tracking-wider text-muted"
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="rounded-lg border border-line bg-surface px-4 py-3 text-sm text-foreground placeholder:text-muted/50 outline-none transition-colors focus:border-teal"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="password"
                  className="font-mono text-xs uppercase tracking-wider text-muted"
                >
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="rounded-lg border border-line bg-surface px-4 py-3 text-sm text-foreground placeholder:text-muted/50 outline-none transition-colors focus:border-teal"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 rounded-full bg-teal px-6 py-3 text-sm font-medium text-bg transition-shadow hover:shadow-[0_0_24px_rgba(47,230,192,0.5)] disabled:opacity-50"
              >
                {loading ? "Joining…" : "Join organization"}
              </button>
            </form>
          </GlassCard>
        </motion.div>
      </motion.div>
    </section>
  );
}
