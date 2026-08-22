import { AUDIENCES } from "@/lib/landing-data";

export function WhoItsFor() {
  return (
    <section id="who-its-for" className="border-y border-line bg-white/60">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <h2 className="font-display text-2xl font-bold text-ink">
          Who it&apos;s for
        </h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {AUDIENCES.map((audience) => (
            <div
              key={audience.title}
              className="rounded-sm border border-line bg-paper p-6"
            >
              <p className="font-display text-base font-bold text-ink">
                {audience.title}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-slate">
                {audience.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
