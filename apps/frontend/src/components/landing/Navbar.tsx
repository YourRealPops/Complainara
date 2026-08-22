import Link from "next/link";

export function Navbar() {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-bg/70 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <span className="font-display text-lg font-extrabold tracking-tight text-foreground">
          Complainara
        </span>
        <nav className="hidden items-center gap-8 text-sm text-muted md:flex">
          <a href="#how-it-works" className="hover:text-foreground transition-colors">
            How it works
          </a>
          <a href="#who-its-for" className="hover:text-foreground transition-colors">
            Who it&apos;s for
          </a>
          <a href="#features" className="hover:text-foreground transition-colors">
            Features
          </a>
        </nav>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm text-foreground hover:text-teal transition-colors">
            Log in
          </Link>
          <Link
            href="/signup"
            className="rounded-full bg-teal px-4 py-2 text-sm font-medium text-bg hover:shadow-[0_0_20px_rgba(47,230,192,0.5)] transition-shadow"
          >
            Get started
          </Link>
        </div>
      </div>
    </header>
  );
}