"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Ticket } from "./Ticket";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

export function Hero() {
  return (
    <section className="mx-auto grid max-w-6xl gap-16 px-6 pb-28 pt-20 md:grid-cols-2 md:items-center">
      <motion.div variants={container} initial="hidden" animate="show">
        <motion.p
          variants={item}
          className="font-mono text-xs uppercase tracking-[0.2em] text-stamp"
        >
          Complaint management, timestamped
        </motion.p>
        <motion.h1
          variants={item}
          className="mt-4 font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-foreground md:text-5xl"
        >
          Every complaint gets a receipt.
          <br />
          And a deadline.
        </motion.h1>
        <motion.p
          variants={item}
          className="mt-6 max-w-md text-base leading-relaxed text-muted"
        >
          Complainara routes complaints to the right team the moment
          they&apos;re filed, and gives everyone a visible timeline for
          resolution. It is built for Organizations, Workplaces, Higher Institutions, e.t.c.
        </motion.p>
        <motion.div variants={item} className="mt-8 flex items-center gap-4">
          <Link
            href="/signup"
            className="rounded-full bg-teal px-6 py-3 text-sm font-medium text-bg hover:shadow-[0_0_24px_rgba(47,230,192,0.5)] transition-shadow"
          >
            Get started
          </Link>
          <Link
            href="#how-it-works"
            className="text-sm font-medium text-foreground underline decoration-line underline-offset-4 hover:decoration-teal"
          >
            See how it works
          </Link>
        </motion.div>
      </motion.div>

      <div className="flex justify-center md:justify-end">
        <Ticket />
      </div>
    </section>
  );
}
