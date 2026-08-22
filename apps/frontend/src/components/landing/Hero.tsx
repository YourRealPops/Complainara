import Link from "next/link";
import { Ticket } from "./Ticket";

export function Hero() {
  return (
    <section className="mx-auto grid max-w-6xl gap-16 px-6 pb-24 pt-12 md:grid-cols-2 md:items-center">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-stamp">
          Complaint management, timestamped
        </p>
        <h1 className="mt-4 font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-ink md:text-5xl">
          Every complaint gets a receipt.
          <br />
          And a deadline.
        </h1>
        <p className="mt-6 max-w-md text-base leading-relaxed text-slate">
          Complainara routes complaints to the right team the moment
          they&apos;re filed, and gives everyone a visible timeline for
          resolution — for schools, hostels, and workplaces.
        </p>
        <div className="mt-8 flex items-center gap-4">
          <Link
            href="/signup"
            className="rounded-sm bg-ink px-6 py-3 text-sm font-medium text-paper hover:bg-teal transition-colors"
          >
            Get started
          </Link>
          <Link
            href="#how-it-works"
            className="text-sm font-medium text-ink underline decoration-line underline-offset-4 hover:decoration-ink"
          >
            See how it works
          </Link>
        </div>
      </div>

      <div className="flex justify-center md:justify-end">
        <Ticket />
      </div>
    </section>
  );
}
