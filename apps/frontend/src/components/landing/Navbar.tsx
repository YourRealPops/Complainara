import Link from "next/link";

export function Navbar() {
  return (
    <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
      <span className="font-display text-lg font-extrabold tracking-tight text-ink">
        Complainara
      </span>
      <nav className="hidden items-center gap-8 text-sm text-slate md:flex">
        <a href="#how-it-works" className="hover:text-ink">
          How it works
        </a>
        <a href="#who-its-for" className="hover:text-ink">
          Who it&apos;s for
        </a>
        <a href="#features" className="hover:text-ink">
          Features
        </a>
      </nav>
      <div className="flex items-center gap-4">
        <Link href="/login" className="text-sm text-ink hover:text-teal">
          Log in
        </Link>
        <Link
          href="/signup"
          className="rounded-sm bg-ink px-4 py-2 text-sm font-medium text-paper hover:bg-teal transition-colors"
        >
          Get started
        </Link>
      </div>
    </header>
  );
}
