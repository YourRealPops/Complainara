import { FadeIn } from "@/components/ui/FadeIn";
import { GlassCard } from "@/components/ui/GlassCard";

export function ProblemStatement() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-20">
      <FadeIn>
        <GlassCard className="p-10 text-center">
          <p className="font-display text-xl font-semibold leading-snug text-foreground md:text-2xl">
            &ldquo;Right now, a complaint means walking to find a warden or
            house master — and hoping. Days pass. No one knows if it&apos;s
            being handled, or forgotten.&rdquo;
          </p>
          <p className="mt-4 text-sm text-muted">
            Complainara replaces the walk and the wait with a routed ticket
            and a deadline.
          </p>
        </GlassCard>
      </FadeIn>
    </section>
  );
}
