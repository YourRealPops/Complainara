"use client";

import { useEffect, useState } from "react";

export function Ticket() {
  const [stamped, setStamped] = useState(false);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const stampTimer = setTimeout(() => setStamped(true), 650);
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
    <div className="relative w-full max-w-sm">
      <div className="relative rotate-1 rounded-sm border border-line bg-white p-6 shadow-[0_1px_0_#D8DDD5,0_20px_40px_-20px_rgba(28,43,42,0.35)]">
        <div className="flex items-start justify-between border-b border-dashed border-line pb-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-widest text-slate">
              Ticket
            </p>
            <p className="font-mono text-sm text-ink">#CX-0417</p>
          </div>
          <div>
            <p className="font-mono text-[11px] uppercase tracking-widest text-slate text-right">
              Filed
            </p>
            <p className="font-mono text-sm text-ink">Today, 09:14</p>
          </div>
        </div>

        <div className="py-5">
          <p className="font-display text-lg font-bold leading-snug text-ink">
            No hot water — Hostel B, 2nd floor
          </p>
          <p className="mt-1 text-sm text-slate">Category: Plumbing</p>
        </div>

        <div className="flex items-center justify-between border-t border-dashed border-line pt-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-widest text-slate">
              Time to fix
            </p>
            <p className="font-mono text-base text-teal">
              {hh}:{mm}:{ss}
            </p>
          </div>
          <div>
            <p className="font-mono text-[11px] uppercase tracking-widest text-slate text-right">
              Routed to
            </p>
            <p className="text-sm text-ink text-right">Maintenance</p>
          </div>
        </div>
      </div>

      <div
        className={`pointer-events-none absolute -right-6 top-8 flex h-24 w-24 -rotate-[18deg] items-center justify-center rounded-full border-[3px] border-double border-stamp transition-all duration-500 ${
          stamped ? "scale-100 opacity-90" : "scale-150 opacity-0"
        }`}
      >
        <span className="font-display text-[11px] font-extrabold uppercase tracking-wider text-stamp">
          Acknowledged
        </span>
      </div>
    </div>
  );
}
