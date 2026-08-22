import { AUDIENCES } from "@/lib/landing-data";
import { FadeIn } from "@/components/ui/FadeIn";
import { GlassCard } from "@/components/ui/GlassCard";

export function WhoItsFor() {
  return (
    <section id="who-its-for" className="mx-auto max-w-6xl px-6 py-24">
      <FadeIn>
        <h2 className="font-display text-2xl font-bold text-foreground">
          Who it&apos;s for
        </h2>
      </FadeIn>
      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {AUDIENCES.map((audience, i) => (
          <FadeIn key={audience.title} delay={i * 0.1}>
            <GlassCard className="h-full p-6 transition-transform hover:-translate-y-1">
              <p className="font-display text-base font-bold text-foreground">
                {audience.title}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {audience.body}
              </p>
            </GlassCard>
          </FadeIn>
        ))}
      </div>
    </section>
  );
}
