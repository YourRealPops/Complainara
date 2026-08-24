"use client";

export function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-10 text-sm text-muted md:flex-row">
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          className="font-display font-bold text-foreground hover:text-teal transition-colors"
        >
          Complainara
        </a>
        <span>
          &copy; {new Date().getFullYear()} Fehinti Codes. All rights reserved.
        </span>
      </div>
    </footer>
  );
}
