import Link from "next/link";

export function CtaBanner() {
  return (
    <section className="mx-auto max-w-6xl px-6 pb-24">
      <div className="relative overflow-hidden rounded-sm border border-line bg-ink px-8 py-14 text-center">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-teal">
          Ready when you are
        </p>
        <h2 className="mt-3 font-display text-2xl font-bold text-paper md:text-3xl">
          Give every complaint a receipt.
        </h2>
        <Link
          href="/signup"
          className="mt-6 inline-block rounded-sm bg-paper px-6 py-3 text-sm font-medium text-ink hover:bg-teal hover:text-paper transition-colors"
        >
          Get started
        </Link>
      </div>
    </section>
  );
}
