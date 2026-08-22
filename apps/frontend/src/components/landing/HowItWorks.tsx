import { LIFECYCLE } from "@/lib/landing-data";
import { FadeIn } from "@/components/ui/FadeIn";

export function HowItWorks() {
  return (
    <section id="how-it-works" className="mx-auto max-w-6xl px-6 py-24">
      <FadeIn>
        <h2 className="font-display text-2xl font-bold text-foreground">
          How it works
        </h2>
        <p className="mt-2 max-w-md text-sm text-muted">
          One path, five stamps. Nothing skips a step, and nothing sits
          untouched.
        </p>
      </FadeIn>

      <div className="mt-12 grid grid-cols-1 gap-0 sm:grid-cols-5">
        {LIFECYCLE.map((stage, i) => (
          <FadeIn key={stage.label} delay={i * 0.08} className="relative px-4 py-6 text-center">
            {i !== 0 && (
              <div className="absolute left-0 top-[26px] hidden h-px w-full -translate-x-1/2 bg-line sm:block" />
            )}
            <div className="relative mx-auto flex h-12 w-12 items-center justify-center rounded-full border-2 border-teal bg-bg shadow-[0_0_16px_rgba(47,230,192,0.35)]">
              <span className="font-mono text-xs text-teal">
                {String(i + 1).padStart(2, "0")}
              </span>
            </div>
            <p className="mt-3 font-display text-sm font-bold text-foreground">
              {stage.label}
            </p>
            <p className="mt-1 text-xs text-muted">{stage.detail}</p>
          </FadeIn>
        ))}
      </div>
    </section>
  );
}
