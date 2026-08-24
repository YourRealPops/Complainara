import type { ReactNode } from "react";

export function GlassCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-line bg-glass backdrop-blur-xl shadow-[0_8px_40px_-12px_var(--color-glass-shadow)] ${className}`}
    >
      {children}
    </div>
  );
}
