import { FEATURES } from "@/lib/landing-data";
import { FadeIn } from "@/components/ui/FadeIn";
import { GlassCard } from "@/components/ui/GlassCard";

export function Features() {
  return (
    <section id="features" className="mx-auto max-w-6xl px-6 py-24">
      <FadeIn>
        <h2 className="font-display text-2xl font-bold text-foreground">
          Built for accountability
        </h2>
      </FadeIn>
      <div className="mt-10 grid gap-6 md:grid-cols-2">
        {FEATURES.map((feature, i) => (
          <FadeIn key={feature.title} delay={i * 0.08}>
            <GlassCard className="h-full p-6 transition-transform hover:-translate-y-1">
              <p className="font-display text-base font-bold text-foreground">
                {feature.title}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {feature.body}
              </p>
            </GlassCard>
          </FadeIn>
        ))}
      </div>
    </section>
  );
}
