import { FEATURES } from "@/lib/landing-data";

export function Features() {
  return (
    <section id="features" className="mx-auto max-w-6xl px-6 py-24">
      <h2 className="font-display text-2xl font-bold text-ink">
        Built for accountability
      </h2>
      <div className="mt-10 grid gap-x-12 gap-y-10 md:grid-cols-2">
        {FEATURES.map((feature) => (
          <div key={feature.title} className="border-t border-line pt-5">
            <p className="font-display text-base font-bold text-ink">
              {feature.title}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-slate">
              {feature.body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
