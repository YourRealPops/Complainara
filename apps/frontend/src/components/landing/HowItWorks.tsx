import { LIFECYCLE } from "@/lib/landing-data";
import { FadeIn } from "@/components/ui/FadeIn";

function ArrowChevron() {
  return (
    <svg
      width="20"
      height="12"
      viewBox="0 0 20 12"
      fill="none"
      className="shrink-0 text-teal/60"
    >
      <path
        d="M1 6h16M13 1l5 5-5 5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ArrowChevronDown() {
  return (
    <svg
      width="12"
      height="20"
      viewBox="0 0 12 20"
      fill="none"
      className="shrink-0 text-teal/60"
    >
      <path
        d="M6 1v16M1 13l5 5 5-5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

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

      {/* ── Desktop: horizontal timeline with arrows ── */}
      <div className="relative mt-14 hidden sm:block">
        {/* Connecting line */}
        <div className="absolute left-[10%] right-[10%] top-[22px] h-px bg-line" />

        <div className="relative grid grid-cols-5 items-start">
          {LIFECYCLE.map((stage, i) => (
            <FadeIn key={stage.label} delay={i * 0.08} className="relative z-10 flex flex-col items-center">
              <div className="relative flex items-center">
                {/* Step circle */}
                <div className="relative mx-auto flex h-11 w-11 items-center justify-center rounded-full border-2 border-teal bg-bg shadow-[0_0_16px_rgba(47,230,192,0.35)]">
                  <span className="font-mono text-[11px] font-medium text-teal">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>

                {/* Arrow between steps */}
                {i < LIFECYCLE.length - 1 && (
                  <div className="absolute left-full top-1/2 flex -translate-y-1/2 pl-2">
                    <ArrowChevron />
                  </div>
                )}
              </div>

              <div className="mt-4 max-w-[160px] text-center">
                <p className="font-display text-sm font-bold text-foreground">
                  {stage.label}
                </p>
                <p className="mt-1.5 text-xs leading-relaxed text-muted">
                  {stage.detail}
                </p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>

      {/* ── Mobile: vertical timeline with arrows ── */}
      <div className="mt-12 flex flex-col items-center sm:hidden">
        {LIFECYCLE.map((stage, i) => (
          <div key={stage.label} className="flex flex-col items-center">
            <FadeIn delay={i * 0.08} className="flex flex-col items-center">
              {/* Step circle */}
              <div className="relative flex h-11 w-11 items-center justify-center rounded-full border-2 border-teal bg-bg shadow-[0_0_16px_rgba(47,230,192,0.35)]">
                <span className="font-mono text-[11px] font-medium text-teal">
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>

              <div className="mt-3 max-w-[260px] text-center">
                <p className="font-display text-sm font-bold text-foreground">
                  {stage.label}
                </p>
                <p className="mt-1.5 text-xs leading-relaxed text-muted">
                  {stage.detail}
                </p>
              </div>
            </FadeIn>

            {/* Vertical arrow between steps */}
            {i < LIFECYCLE.length - 1 && (
              <div className="my-2 py-1">
                <ArrowChevronDown />
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
