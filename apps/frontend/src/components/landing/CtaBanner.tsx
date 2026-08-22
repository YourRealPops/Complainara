import Link from "next/link";
import { FadeIn } from "@/components/ui/FadeIn";
import { GlassCard } from "@/components/ui/GlassCard";

export function CtaBanner() {
  return (
    <section className="mx-auto max-w-6xl px-6 pb-24">
      <FadeIn>
        <GlassCard className="relative overflow-hidden px-8 py-16 text-center">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-teal">
            Ready when you are
          </p>
          <h2 className="mt-3 font-display text-2xl font-bold text-foreground md:text-3xl">
            Give every complaint a receipt.
          </h2>
          <Link
            href="/signup"
            className="mt-6 inline-block rounded-full bg-teal px-6 py-3 text-sm font-medium text-bg hover:shadow-[0_0_24px_rgba(47,230,192,0.5)] transition-shadow"
          >
            Get started
          </Link>
        </GlassCard>
      </FadeIn>
    </section>
  );
}
