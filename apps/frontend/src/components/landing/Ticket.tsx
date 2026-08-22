"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { GlassCard } from "@/components/ui/GlassCard";

export function Ticket() {
  const [stamped, setStamped] = useState(false);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const stampTimer = setTimeout(() => setStamped(true), 900);
    const tickTimer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => {
      clearTimeout(stampTimer);
      clearInterval(tickTimer);
    };
  }, []);

  const hh = String(47 - Math.floor(seconds / 3600)).padStart(2, "0");
  const mm = String(59 - Math.floor((seconds % 3600) / 60)).padStart(2, "0");
  const ss = String(59 - (seconds % 60)).padStart(2, "0");

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, rotate: -2 }}
      animate={{ opacity: 1, y: 0, rotate: -1 }}
      whileHover={{ rotate: 0, y: -6 }}
      transition={{ duration: 0.7, ease: "easeOut" }}
      className="relative w-full max-w-sm"
    >
      <GlassCard className="p-6">
        <div className="flex items-start justify-between border-b border-line pb-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-widest text-muted">
              Ticket
            </p>
            <p className="font-mono text-sm text-foreground">#CX-0417</p>
          </div>
          <div>
            <p className="font-mono text-[11px] uppercase tracking-widest text-muted text-right">
              Filed
            </p>
            <p className="font-mono text-sm text-foreground">Today, 09:14</p>
          </div>
        </div>

        <div className="py-5">
          <p className="font-display text-lg font-bold leading-snug text-foreground">
            No hot water — Hostel B, 2nd floor
          </p>
          <p className="mt-1 text-sm text-muted">Category: Plumbing</p>
        </div>

        <div className="flex items-center justify-between border-t border-line pt-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-widest text-muted">
              Time to fix
            </p>
            <p className="font-mono text-base text-teal">
              {hh}:{mm}:{ss}
            </p>
          </div>
          <div>
            <p className="font-mono text-[11px] uppercase tracking-widest text-muted text-right">
              Routed to
            </p>
            <p className="text-sm text-foreground text-right">Maintenance</p>
          </div>
        </div>
      </GlassCard>

      <motion.div
        initial={{ scale: 1.6, opacity: 0, rotate: -18 }}
        animate={
          stamped
            ? { scale: 1, opacity: 0.95, rotate: -18 }
            : { scale: 1.6, opacity: 0 }
        }
        transition={{ type: "spring", stiffness: 260, damping: 18 }}
        className="pointer-events-none absolute -right-6 top-8 flex h-24 w-24 items-center justify-center rounded-full border-[3px] border-double border-stamp"
        style={{ boxShadow: "0 0 24px rgba(255,107,74,0.35)" }}
      >
        <span className="font-display text-[11px] font-extrabold uppercase tracking-wider text-stamp">
          Acknowledged
        </span>
      </motion.div>
    </motion.div>
  );
}
